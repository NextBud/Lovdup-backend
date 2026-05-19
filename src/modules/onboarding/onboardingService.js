import prisma from "../../config/prisma.js";
import * as onboardingDb from "./onboardingDbService.js";
import { extractProfilePayloads } from "./onboarding.helpers.js";
import { ONBOARDING_STATUS } from "./onboarding.constants.js";
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from "../../classes/errorClasses.js";
import {
  completeOnboardingSchema,
  saveOnboardingProgressSchema,
} from "./onboardingValidator.js";

// ─────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────

export const getMyOnboarding = async (userId) => {
  const progress = await onboardingDb.findProgressByUserId(userId);

  // Return a shell even if they haven't started — frontend needs something
  if (!progress) {
    return {
      status: ONBOARDING_STATUS.NOT_STARTED,
      currentStep: 1,
      completedSections: [],
      draftData: {},
    };
  }

  return progress;
};

// ─────────────────────────────────────────────
// SAVE PROGRESS (autosave per section)
// ─────────────────────────────────────────────

export const saveProgress = async (userId, payload) => {
  const { error, value } = saveOnboardingProgressSchema.validate(payload, {
    abortEarly: false,
  });

  if (error) {
    throw new BadRequestError(error.details.map((d) => d.message).join(", "));
  }

  return onboardingDb.saveProgress(userId, value);
};

// ─────────────────────────────────────────────
// COMPLETE ONBOARDING
// The big one. Validates payload, then runs a single transaction that:
//   1. Guards against double-completion
//   2. Creates Profile + all 4 sub-models
//   3. Promotes staged OnboardingMedia → ProfilePhoto + VoiceAnswer
//   4. Creates Wallet (every user gets one on completion)
//   5. Marks OnboardingProgress as COMPLETED and clears draft
//   6. Marks User.onboardingCompleted (via Profile)
// ─────────────────────────────────────────────

export const completeOnboarding = async (userId, payload) => {
  // 1. Validate the submission
  const { error, value } = completeOnboardingSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw new BadRequestError(error.details.map((d) => d.message).join(", "));
  }

  // 2. Guard: must have progress row in a startable state
  const progress = await onboardingDb.findProgressByUserId(userId);

  if (!progress) {
    throw new NotFoundError("No onboarding session found. Start from step 1.");
  }

  if (progress.status === ONBOARDING_STATUS.COMPLETED) {
    throw new ConflictError("Onboarding already completed.");
  }

  // 3. The transaction
  return prisma.$transaction(async (tx) => {
    // Pull staged media uploaded during steps 18-23
    const stagedMedia = await onboardingDb.findOnboardingMediaByUserId(
      userId,
      tx,
    );

    const stagedPhotos = stagedMedia
      .filter((m) => m.mediaType === "image")
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    const stagedVoices = stagedMedia.filter((m) => m.mediaType === "audio");

    // Validate media minimums inside the transaction (so we have the latest data)
    if (stagedPhotos.length < 2) {
      throw new BadRequestError(
        "At least 2 photos are required to complete onboarding.",
      );
    }

    if (stagedVoices.length < 5) {
      throw new BadRequestError(
        "All 5 voice recordings are required to complete onboarding.",
      );
    }

    // Split flat payload into sub-model shapes
    const { identity, lifestyle, values, narrative } =
      extractProfilePayloads(value);

    // Create Profile (the parent of everything)
    const profile = await tx.profile.create({
      data: {
        userId,
        onboardingCompleted: true,
        completedAt: new Date(),
        // Sub-models created via nested writes
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

    // Promote staged voices → VoiceAnswer
    // promptId was stored on the staged record when the user uploaded
    await tx.voiceAnswer.createMany({
      data: stagedVoices.map((voice) => ({
        userId,
        profileId: profile.id,
        voicePromptId: voice.promptId,
        url: voice.url,
        publicId: voice.publicId,
        mimeType: voice.mimeType,
        size: voice.size,
      })),
    });

    // Create Wallet (every completed user gets one with 0 balance)
    await tx.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: 0 },
    });

    // Clean up staged media — no longer needed
    await onboardingDb.deleteOnboardingMediaByUserId(userId, tx);

    // Mark onboarding complete
    await onboardingDb.markCompleted(userId, tx);

    return {
      profileId: profile.id,
      message: "Welcome to LovdUp.",
    };
  });
};

// ─────────────────────────────────────────────
// RESET (dev/admin use — wipes progress and staged media)
// ─────────────────────────────────────────────

export const resetOnboarding = async (userId) => {
  return prisma.$transaction(async (tx) => {
    // Only allow reset if not already completed
    const progress = await onboardingDb.findProgressByUserId(userId, tx);

    if (progress?.status === ONBOARDING_STATUS.COMPLETED) {
      throw new ConflictError("Cannot reset a completed onboarding.");
    }

    await onboardingDb.deleteOnboardingMediaByUserId(userId, tx);
    await onboardingDb.resetProgress(userId, tx);

    return { reset: true };
  });
};
