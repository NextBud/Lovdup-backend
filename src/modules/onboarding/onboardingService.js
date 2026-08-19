import prisma from "../../config/prisma.js";
import * as onboardingDb from "./onboardingDbService.js";
import { extractProfilePayloads } from "./onboarding.helpers.js";
import { getStepIndex } from "./onboarding.steps.js";
import { ONBOARDING_STATUS } from "./onboarding.constants.js";
import { validateStepCompletion } from "./onboarding.guards.js";
import { createReferralCode } from "../referral/referral.service.js";
import {
  NotFoundException,
  BadRequestError,
  ConflictException,
} from "../../classes/errorClasses.js";
import { completeOnboardingSchema } from "./onboardingValidator.js";
import * as referralService from "../referral/referral.service.js";
import { emitUserOnboardingCompleted } from "../../events/helpers/user.events.js";

// ─────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────

export const getMyOnboarding = async (userId) => {
  const progress = await onboardingDb.findProgressByUserId(userId);

  if (!progress) {
    return {
      status: ONBOARDING_STATUS.NOT_STARTED,
      currentStep: 1,
      currentStepId: "name",
      completedSections: [],
      draftData: {
        profile: {},
        completedSteps: [],
        currentStepId: "name",
      },
    };
  }

  return progress;
};

// ─────────────────────────────────────────────
// SAVE PROGRESS (autosave)
// Frontend sends: { stepId: string, data: { profile, completedSteps, currentStepId } }
// ─────────────────────────────────────────────

export const saveProgress = async ({ userId, stepId, data }) => {
  let progress = await prisma.onboardingProgress.findUnique({
    where: { userId },
  });

  if (!progress) {
    progress = await prisma.onboardingProgress.create({
      data: {
        userId,
        status: ONBOARDING_STATUS.IN_PROGRESS,
        currentStep: 1,
        completedSections: [],
        draftData: {
          profile: {},
          completedSteps: [],
          currentStepId: "name",
        },
      },
    });
  }

  const updatedDraft = {
    ...progress.draftData,
    ...data,
  };

  const isValidStep = validateStepCompletion(
    stepId,
    updatedDraft?.profile ?? updatedDraft,
  );

  let nextStepIndex;
  try {
    nextStepIndex = getStepIndex(stepId);
  } catch {
    // Unknown stepId — don't advance currentStep but still save draft
    nextStepIndex = progress.currentStep;
  }

  return prisma.onboardingProgress.update({
    where: { userId },
    data: {
      draftData: updatedDraft,
      status: ONBOARDING_STATUS.IN_PROGRESS,
      currentStep: isValidStep
        ? Math.max(progress.currentStep, nextStepIndex)
        : progress.currentStep,
    },
  });
};

// Keep saveDraft as an alias — some internal callers may use it
export const saveDraft = saveProgress;

// ─────────────────────────────────────────────
// COMPLETE ONBOARDING
// ─────────────────────────────────────────────
//
// Only the DB writes that must be atomic together (profile + sub-models,
// promoted photos, wallet bootstrap, staged-media cleanup, completion
// status) live inside the transaction. Referral code creation and event
// emission run AFTER it commits — they already tolerate failure without
// rolling back onboarding (see the try/catch below), so there's no reason
// to spend transaction-timeout budget on them. This keeps the transaction
// short enough to comfortably clear Prisma's interactive-transaction
// timeout, with the explicit `timeout`/`maxWait` below as extra headroom.
// ─────────────────────────────────────────────

export const completeOnboarding = async (userId, payload) => {
  // 1. Validate payload
  const { error, value } = completeOnboardingSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw new BadRequestError(error.details.map((d) => d.message).join(", "));
  }

  // 2. Transaction — atomic writes and race-condition guard
  const result = await prisma.$transaction(
    async (tx) => {
      // 2a. Guard against concurrent retries/double-clicks INSIDE the transaction.
      // This ensures we see the most up-to-date committed state, preventing race conditions.
      const progress = await tx.onboardingProgress.findUnique({
        where: { userId },
      });

      if (!progress) {
        throw new NotFoundException(
          "No onboarding session found. Start from step 1.",
        );
      }

      if (progress.status === ONBOARDING_STATUS.COMPLETED) {
        // Already completed (e.g., concurrent request or previous success with network drop)
        const existingProfile = await tx.profile.findUnique({
          where: { userId },
          select: { id: true },
        });
        return { profileId: existingProfile?.id, alreadyCompleted: true };
      }

      const stagedMedia = await onboardingDb.findOnboardingMediaByUserId(
        userId,
        tx,
      );
      const stagedPhotos = stagedMedia
        .filter((m) => m.mediaType === "image")
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      if (stagedPhotos.length < 2) {
        throw new BadRequestError("At least 2 photos are required.");
      }

      const { identity, lifestyle, values, narrative } =
        extractProfilePayloads(value);

      // 2b. Use upsert to ensure idempotency if a partial failure somehow left a Profile row
      const profile = await tx.profile.upsert({
        where: { userId },
        update: {
          onboardingCompleted: true,
          completedAt: new Date(),
          identity: { upsert: { create: identity, update: identity } },
          lifestyle: { upsert: { create: lifestyle, update: lifestyle } },
          values: { upsert: { create: values, update: values } },
          narrative: { upsert: { create: narrative, update: narrative } },
        },
        create: {
          userId,
          onboardingCompleted: true,
          completedAt: new Date(),
          identity: { create: identity },
          lifestyle: { create: lifestyle },
          values: { create: values },
          narrative: { create: narrative },
        },
      });

      // 2c. Promote staged photos → ProfilePhoto
      await tx.profilePhoto.deleteMany({
        where: { profileId: profile.id },
      });

      await tx.profilePhoto.createMany({
        data: stagedPhotos.map((photo, index) => ({
          userId,
          profileId: profile.id,
          url: photo.url,
          publicId: photo.publicId,
          mimeType: photo.mimeType,
          size: photo.size,
          position: index + 1,
          isPrimary: index === 0,
        })),
      });

      // 1. Ensure wallet exists
      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balance: 0 },
      });

      // 2. Apply the 15-coin Welcome Bonus
      const balanceBefore = wallet.balance;
      const bonusAmount = 15;
      const balanceAfter = balanceBefore + bonusAmount;

      await tx.walletTransaction.create({
        data: {
          userId,
          walletId: wallet.id,
          type: "CREDIT",
          amount: bonusAmount,
          reason: "WELCOME_BONUS",
          referenceType: "SYSTEM",
          referenceId: null,
          balanceBefore,
          balanceAfter,
          metadata: { welcome: true },
        },
      });

      // 3. Update the wallet balance
      await tx.wallet.update({
        where: { userId },
        data: { balance: balanceAfter },
      });

      // Clean up staged media
      await onboardingDb.deleteOnboardingMediaByUserId(userId, tx);

      // Mark complete
      await onboardingDb.markCompleted(userId, tx);

      return { profileId: profile.id, alreadyCompleted: false };
    },
    {
      timeout: 15000, // headroom for the multi-write sequence
      maxWait: 5000,
    },
  );

  // 3. If it was already completed, return early gracefully without re-emitting events
  if (result.alreadyCompleted) {
    return {
      profileId: result.profileId,
      message: "Onboarding already completed.",
    };
  }

  // ─────────────────────────────────────────────
  // CREATE REFERRAL CODE FOR THE USER
  // ─────────────────────────────────────────────
  let referralCode;
  try {
    const existingCode = await prisma.referralCode.findUnique({
      where: { userId },
    });

    if (!existingCode) {
      referralCode = await createReferralCode(userId);
    } else {
      referralCode = existingCode;
    }
  } catch (error) {
    console.error(`Failed to create referral code for user ${userId}:`, error);
  }

  // ─────────────────────────────────────────────
  // EMIT USER ONBOARDING COMPLETED EVENT
  // ─────────────────────────────────────────────
  emitUserOnboardingCompleted({
    userId,
    profileId: result.profileId,
    referralCode: referralCode?.code,
    timestamp: new Date(),
  });

  return {
    profileId: result.profileId,
    referralCode: referralCode?.code,
    message: "Welcome to LovdUp.",
  };
};
// ─────────────────────────────────────────────
// RESET
// ─────────────────────────────────────────────

export const resetOnboarding = async (userId) => {
  return prisma.$transaction(async (tx) => {
    const progress = await onboardingDb.findProgressByUserId(userId, tx);

    if (progress?.status === ONBOARDING_STATUS.COMPLETED) {
      throw new ConflictException("Cannot reset a completed onboarding.");
    }

    await onboardingDb.deleteOnboardingMediaByUserId(userId, tx);
    await onboardingDb.resetProgress(userId, tx);

    return { reset: true };
  });
};

// ─────────────────────────────────────────────
// GET STATE (for hydration)
// Shape matches what onboardingHydrationService.hydrate() reads
// ─────────────────────────────────────────────

export const getMyOnboardingState = async (userId) => {
  const progress = await onboardingDb.findProgressByUserId(userId);

  if (!progress) {
    return {
      status: ONBOARDING_STATUS.NOT_STARTED,
      currentStep: 1,
      currentStepId: "name",
      completedSections: [],
      draftData: {
        profile: {},
        completedSteps: [],
        currentStepId: "name",
      },
    };
  }

  return {
    status: progress.status,
    currentStep: progress.currentStep,
    completedSections: progress.completedSections,
    draftData: progress.draftData,
  };
};
