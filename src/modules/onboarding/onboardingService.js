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

  // 2. Guard: must have a progress row
  const progress = await onboardingDb.findProgressByUserId(userId);

  if (!progress) {
    throw new NotFoundException(
      "No onboarding session found. Start from step 1.",
    );
  }

  if (progress.status === ONBOARDING_STATUS.COMPLETED) {
    throw new ConflictException("Onboarding already completed.");
  }

  // 3. Transaction — atomic writes only
  const { profileId } = await prisma.$transaction(
    async (tx) => {
      const stagedMedia = await onboardingDb.findOnboardingMediaByUserId(
        userId,
        tx,
      );

      const stagedPhotos = stagedMedia
        .filter((m) => m.mediaType === "image")
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      // Voice media is no longer required; we only enforce photos
      if (stagedPhotos.length < 2) {
        throw new BadRequestError("At least 2 photos are required.");
      }

      // Split payload into sub-model shapes
      const { identity, lifestyle, values, narrative } =
        extractProfilePayloads(value);

      // Create Profile + sub-models
      const profile = await tx.profile.create({
        data: {
          userId,
          onboardingCompleted: true,
          completedAt: new Date(),
          identity: { create: identity },
          lifestyle: { create: lifestyle },
          values: { create: values },
          narrative: { create: narrative },
        },
      });

      // Promote staged photos → ProfilePhoto
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

      // Voice answers are no longer created; the voice tables remain for other uses.

      // Create Wallet
      await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balance: 0 },
      });

      // Clean up staged media (including any leftover voice entries)
      await onboardingDb.deleteOnboardingMediaByUserId(userId, tx);

      // Mark complete
      await onboardingDb.markCompleted(userId, tx);

      return { profileId: profile.id };
    },
    {
      timeout: 15000, // default is 5000ms — headroom for the multi-write sequence above
      maxWait: 5000,
    },
  );

  // ─────────────────────────────────────────────
  // CREATE REFERRAL CODE FOR THE USER
  // ─────────────────────────────────────────────
  // Runs outside the transaction on purpose — see comment above
  // completeOnboarding. Failure here must not undo onboarding.
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
    // Log error but don't fail onboarding if referral creation fails
    console.error(`Failed to create referral code for user ${userId}:`, error);
    // We'll still emit the event, but the listener might need to handle missing code
  }

  // ─────────────────────────────────────────────
  // EMIT USER ONBOARDING COMPLETED EVENT
  // ─────────────────────────────────────────────
  // This will trigger the referral qualification listener
  // which will check if the user was referred by someone
  emitUserOnboardingCompleted({
    userId,
    profileId,
    referralCode: referralCode?.code,
    timestamp: new Date(),
  });

  return {
    profileId,
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
