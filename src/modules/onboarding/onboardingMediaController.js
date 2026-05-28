import prisma from "../../config/prisma.js";
import { processMediaUploads } from "../media/processMediaUploads.js";
import * as onboardingDb from "./onboardingDbService.js";
import { BadRequestError } from "../../lib/classes/errorClasses.js";
import asyncWrapper from "../../lib/asyncWrapper.js";
import {
  MAX_ONBOARDING_PHOTOS,
  MIN_ONBOARDING_PHOTOS,
  MAX_ONBOARDING_VOICES,
} from "./onboarding.constants.js";

// ─────────────────────────────────────────────
// PHOTOS  (step 23)
// ─────────────────────────────────────────────

export const uploadOnboardingPhotos = asyncWrapper(async (req, res) => {
  const userId = req.user.userId;

  if (!req.files?.length) {
    throw new BadRequestError("Please upload at least one photo.");
  }

  if (req.files.length > MAX_ONBOARDING_PHOTOS) {
    throw new BadRequestError(
      `Maximum ${MAX_ONBOARDING_PHOTOS} photos allowed.`,
    );
  }

  // Upload all files to Cloudinary in parallel
  const uploadedItems = await processMediaUploads({
    files: req.files,
    folder: `lovdup/onboarding/${userId}/photos`,
    mediaType: "image",
  });

  const result = await prisma.$transaction(async (tx) => {
    const existing = await onboardingDb.findProgressByUserId(userId, tx);
    const existingDraft = existing?.draftData || {};

    // Count already-staged photos so we can assign sequential positions
    const alreadyStaged = await tx.onboardingMedia.count({
      where: { userId, mediaType: "image" },
    });

    const items = uploadedItems.map((item, index) => ({
      ...item,
      position: alreadyStaged + index + 1,
    }));

    await onboardingDb.createOnboardingMedia(userId, items, tx);

    // Track photo IDs in draft for quick frontend reference
    const photoPublicIds = items.map((i) => i.publicId);
    const existingPhotos = existingDraft.photoPublicIds || [];

    const progress = await onboardingDb.saveProgress(
      userId,
      {
        currentStep: existing?.currentStep ?? 23,
        completedSections: ["photos"],
        draftData: {
          photoPublicIds: [...existingPhotos, ...photoPublicIds],
        },
      },
      tx,
    );

    return { items, progress };
  });

  return res.status(201).json({
    success: true,
    message: "Photos uploaded.",
    data: {
      photos: result.items,
      onboarding: result.progress,
    },
  });
});

// ─────────────────────────────────────────────
// VOICES  (steps 18-22, one recording per request)
// ─────────────────────────────────────────────

export const uploadOnboardingVoices = asyncWrapper(async (req, res) => {
  const userId = req.user.userId;

  if (!req.files?.length) {
    throw new BadRequestError("Please upload at least one voice recording.");
  }

  if (req.files.length > MAX_ONBOARDING_VOICES) {
    throw new BadRequestError(
      `Maximum ${MAX_ONBOARDING_VOICES} voice recordings allowed.`,
    );
  }

  // promptIds must be sent as a JSON array in the request body
  // e.g. body: { promptIds: ["prompt-uuid-1", "prompt-uuid-2"] }
  const promptIds = req.body.promptIds ? JSON.parse(req.body.promptIds) : [];

  if (promptIds.length !== req.files.length) {
    throw new BadRequestError(
      "Each voice recording must have a corresponding promptId. " +
        `Got ${req.files.length} file(s) but ${promptIds.length} promptId(s).`,
    );
  }

  const uploadedItems = await processMediaUploads({
    files: req.files,
    folder: `lovdup/onboarding/${userId}/voices`,
    mediaType: "audio",
  });

  const result = await prisma.$transaction(async (tx) => {
    const existing = await onboardingDb.findProgressByUserId(userId, tx);
    const existingDraft = existing?.draftData || {};

    const validPrompts = await tx.voicePrompt.findMany({
      where: {
        id: {
          in: promptIds,
        },
      },
    });

    if (validPrompts.length !== promptIds.length) {
      throw new BadRequestError("Invalid voice prompts.");
    }

    const items = uploadedItems.map((item, index) => ({
      ...item,
      promptId: promptIds[index],
    }));

    await onboardingDb.createOnboardingMedia(userId, items, tx);

    const existingVoices = existingDraft.voicePublicIds || [];
    const voicePublicIds = items.map((i) => i.publicId);

    const progress = await onboardingDb.saveProgress(
      userId,
      {
        currentStep: existing?.currentStep ?? 18,
        completedSections: ["voice"],
        draftData: {
          voicePublicIds: [...existingVoices, ...voicePublicIds],
        },
      },
      tx,
    );

    return { items, progress };
  });

  return res.status(201).json({
    success: true,
    message: "Voice recordings uploaded.",
    data: {
      voices: result.items,
      onboarding: result.progress,
    },
  });
});
