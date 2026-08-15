import prisma from "../../config/prisma.js";
import { processMediaUploads } from "../../middlewares/processMediaUploads.js";
import * as onboardingDb from "./onboardingDbService.js";
import { BadRequestError } from "../../classes/errorClasses.js";
import asyncWrapper from "../../lib/asyncWrapper.js";

import {
  MAX_ONBOARDING_PHOTOS,
  MIN_ONBOARDING_PHOTOS,
} from "./onboarding.constants.js";

// ─────────────────────────────────────────────
// PHOTOS
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

    // Count already-staged photos so we can assign sequential positions.
    const alreadyStaged = await tx.onboardingMedia.count({
      where: {
        userId,
        mediaType: "image",
      },
    });

    const items = uploadedItems.map((item, index) => ({
      ...item,
      position: alreadyStaged + index + 1,
    }));

    await onboardingDb.createOnboardingMedia(userId, items, tx);

    // Track photo IDs in draft for quick frontend reference.
    const photoPublicIds = items.map((item) => item.publicId);
    const existingPhotos = existingDraft.photoPublicIds || [];

    const progress = await onboardingDb.saveProgress(
      userId,
      {
        currentStep: existing?.currentStep ?? 17,
        completedSections: ["photos"],
        draftData: {
          photoPublicIds: [...existingPhotos, ...photoPublicIds],
        },
      },
      tx,
    );

    return {
      items,
      progress,
    };
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
