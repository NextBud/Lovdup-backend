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
  console.log("\n========================================");
  console.log("🚀 COMPLETE ONBOARDING START");
  console.log("User ID:", userId);
  console.log("========================================\n");

  // 1. Validate payload
  console.log("1️⃣ Validating onboarding payload...");

  const { error, value } = completeOnboardingSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    console.error("❌ Payload validation failed:");
    console.error(error.details);

    throw new BadRequestError(
      error.details.map((d) => d.message).join(", "),
    );
  }

  console.log("✅ Payload validation passed");

  // 2. Transaction
  console.log("\n🔵 Starting Prisma transaction...");

  const transactionStartedAt = Date.now();

  const result = await prisma.$transaction(
    async (tx) => {
      console.log("\n----------------------------------------");
      console.log("🔵 TRANSACTION ENTERED");
      console.log("----------------------------------------");

      // --------------------------------------------------
      // 2a. Find onboarding progress
      // --------------------------------------------------

      console.log("\n2️⃣ Fetching onboarding progress...");

      const progress = await tx.onboardingProgress.findUnique({
        where: { userId },
      });

      console.log("✅ Progress query completed");

      if (!progress) {
        console.error("❌ No onboarding progress found");

        throw new NotFoundException(
          "No onboarding session found. Start from step 1.",
        );
      }

      console.log("Progress status:", progress.status);
      console.log("Progress currentStep:", progress.currentStep);

      if (progress.status === ONBOARDING_STATUS.COMPLETED) {
        console.log("⚠️ Onboarding already completed");

        const existingProfile = await tx.profile.findUnique({
          where: { userId },
          select: { id: true },
        });

        console.log(
          "Existing profile:",
          existingProfile?.id ?? "NOT FOUND",
        );

        return {
          profileId: existingProfile?.id,
          alreadyCompleted: true,
        };
      }

      // --------------------------------------------------
      // 2b. Find staged media
      // --------------------------------------------------

      console.log("\n3️⃣ Fetching staged onboarding media...");

      const stagedMedia =
        await onboardingDb.findOnboardingMediaByUserId(userId, tx);

      console.log(
        `✅ Found ${stagedMedia.length} staged media records`,
      );

      const stagedPhotos = stagedMedia
        .filter((m) => m.mediaType === "image")
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      console.log(`📸 Staged photos: ${stagedPhotos.length}`);

      if (stagedPhotos.length < 2) {
        console.error("❌ Not enough photos");

        throw new BadRequestError("At least 2 photos are required.");
      }

      // --------------------------------------------------
      // Extract profile payload
      // --------------------------------------------------

      console.log("\n4️⃣ Extracting profile payloads...");

      const {
        identity,
        lifestyle,
        values,
        narrative,
      } = extractProfilePayloads(value);

      console.log("✅ Profile payloads extracted");

      // --------------------------------------------------
      // 2c. Profile upsert
      // --------------------------------------------------

      console.log(
  `[${new Date().toISOString()}] 5️⃣ Upserting profile...`,
);

      const profile = await tx.profile.upsert({
        where: { userId },
        update: {
          onboardingCompleted: true,
          completedAt: new Date(),
          identity: {
            upsert: {
              create: identity,
              update: identity,
            },
          },
          lifestyle: {
            upsert: {
              create: lifestyle,
              update: lifestyle,
            },
          },
          values: {
            upsert: {
              create: values,
              update: values,
            },
          },
          narrative: {
            upsert: {
              create: narrative,
              update: narrative,
            },
          },
        },
        create: {
          userId,
          onboardingCompleted: true,
          completedAt: new Date(),
          identity: {
            create: identity,
          },
          lifestyle: {
            create: lifestyle,
          },
          values: {
            create: values,
          },
          narrative: {
            create: narrative,
          },
        },
      });

      console.log("✅ Profile upsert completed");
      console.log("Profile ID:", profile.id);

      // --------------------------------------------------
      // Delete existing profile photos
      // --------------------------------------------------

      console.log("\n6️⃣ Deleting existing profile photos...");

      const deletedPhotos = await tx.profilePhoto.deleteMany({
        where: {
          profileId: profile.id,
        },
      });

      console.log(
        `✅ Deleted ${deletedPhotos.count} existing profile photos`,
      );

      // --------------------------------------------------
      // Create profile photos
      // --------------------------------------------------

      console.log("\n7️⃣ Creating profile photos...");

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

      console.log("✅ Profile photos created");

      // --------------------------------------------------
      // Wallet
      // --------------------------------------------------

      console.log("\n8️⃣ Upserting wallet...");

      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          balance: 0,
        },
      });

      console.log("✅ Wallet upsert completed");
      console.log("Wallet ID:", wallet.id);
      console.log("Wallet balance:", wallet.balance);

      // --------------------------------------------------
      // Welcome bonus
      // --------------------------------------------------

      console.log("\n9️⃣ Creating welcome bonus transaction...");

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
          metadata: {
            welcome: true,
          },
        },
      });

      console.log("✅ Welcome bonus transaction created");
      console.log(`Balance: ${balanceBefore} → ${balanceAfter}`);

      // --------------------------------------------------
      // Update wallet balance
      // --------------------------------------------------

      console.log("\n🔟 Updating wallet balance...");

      await tx.wallet.update({
        where: {
          userId,
        },
        data: {
          balance: balanceAfter,
        },
      });

      console.log("✅ Wallet balance updated");

      // --------------------------------------------------
      // Delete staged media
      // --------------------------------------------------

      console.log("\n1️⃣1️⃣ Deleting staged onboarding media...");

      const deletedMedia =
        await onboardingDb.deleteOnboardingMediaByUserId(
          userId,
          tx,
        );

      console.log(
        `✅ Deleted ${deletedMedia.count} staged media records`,
      );

      // --------------------------------------------------
      // Mark onboarding complete
      // --------------------------------------------------

      console.log("\n1️⃣2️⃣ Marking onboarding as COMPLETED...");

      console.log("Transaction client exists:", !!tx);
      console.log("Calling onboardingDb.markCompleted()...");

      const completedProgress =
        await onboardingDb.markCompleted(userId, tx);

      console.log("✅ Onboarding progress marked COMPLETED");
      console.log(
        "Completed progress ID:",
        completedProgress.id,
      );

      // --------------------------------------------------
      // Transaction result
      // --------------------------------------------------

      console.log("\n🎯 TRANSACTION CALLBACK COMPLETED");
      console.log("Returning transaction result...");

      return {
        profileId: profile.id,
        alreadyCompleted: false,
      };
    },
    {
      timeout: 15000,
      maxWait: 5000,
    },
  );

  const transactionDuration = Date.now() - transactionStartedAt;

  console.log("\n========================================");
  console.log("✅ TRANSACTION COMMITTED");
  console.log("Duration:", `${transactionDuration}ms`);
  console.log("Result:", result);
  console.log("========================================\n");

  // --------------------------------------------------
  // Already completed
  // --------------------------------------------------

  if (result.alreadyCompleted) {
    console.log("ℹ️ Onboarding was already completed");

    return {
      profileId: result.profileId,
      message: "Onboarding already completed.",
    };
  }

  // --------------------------------------------------
  // Referral code
  // --------------------------------------------------

  console.log("\n1️⃣3️⃣ Creating/fetching referral code...");

  let referralCode;

  try {
    const existingCode = await prisma.referralCode.findUnique({
      where: { userId },
    });

    if (!existingCode) {
      console.log("No referral code found. Creating one...");

      referralCode = await createReferralCode(userId);

      console.log("✅ Referral code created");
    } else {
      console.log("✅ Existing referral code found");

      referralCode = existingCode;
    }
  } catch (error) {
    console.error(
      `❌ Failed to create referral code for user ${userId}:`,
      error,
    );
  }

  // --------------------------------------------------
  // Event
  // --------------------------------------------------

  console.log("\n1️⃣4️⃣ Emitting onboarding completed event...");

  emitUserOnboardingCompleted({
    userId,
    profileId: result.profileId,
    referralCode: referralCode?.code,
    timestamp: new Date(),
  });

  console.log("✅ Event emitted");

  console.log("\n========================================");
  console.log("🎉 COMPLETE ONBOARDING FINISHED");
  console.log("========================================\n");

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
