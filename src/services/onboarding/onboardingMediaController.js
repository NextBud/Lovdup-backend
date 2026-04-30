import prisma from "../config/prisma.js";
import * as mediaDb from "../media/mediaDbService.js";
import * as onboardingDb from "./onboardingDbService.js";
import { processMediaUploads } from "../media/processMediaUploads.js";
import { BadRequestError } from "../lib/classes/errorClasses.js";
import { asyncWrapper } from "../lib/asyncWrapper.js";

export const uploadOnboardingPhotos = asyncWrapper(async (req, res) => {
  const userId = req.user.userId;

  if (!req.files?.length) {
    throw new BadRequestError("Please upload at least one photo");
  }

  if (req.files.length > 4) {
    throw new BadRequestError("You can upload a maximum of 4 photos");
  }

  const uploadedItems = await processMediaUploads({
    files: req.files,
    folder: `onboarding/${userId}/photos`,
    mediaType: "image",
  });

  const result = await prisma.$transaction(async (tx) => {
    const media = await mediaDb.createManyMedia(
      uploadedItems.map((item) => ({
        ...item,
        userId,
      })),
      tx,
    );

    const existing = await onboardingDb.findProgressByUserId(userId, tx);

    const existingDraft = existing?.draftData || {};
    const existingPhotos = existingDraft.photos || [];

    const photoIds = media.map((item) => item.id);

    const progress = await onboardingDb.upsertProgress(
      userId,
      {
        currentStep: existing?.currentStep ?? 23,
        completedSections: Array.from(
          new Set([...(existing?.completedSections || []), "photos"]),
        ),
        draftData: {
          ...existingDraft,
          photos: [...existingPhotos, ...photoIds],
        },
        status: "IN_PROGRESS",
      },
      tx,
    );

    return { media, progress };
  });

  return res.status(201).json({
    success: true,
    message: "Photos uploaded successfully",
    data: {
      photos: result.media,
      onboarding: result.progress,
    },
  });
});

export const uploadOnboardingVoices = asyncWrapper(async (req, res) => {
  const userId = req.user.userId;

  if (!req.files?.length) {
    throw new BadRequestError("Please upload at least one voice recording");
  }

  if (req.files.length > 5) {
    throw new BadRequestError("You can upload a maximum of 5 voice recordings");
  }

  const uploadedItems = await processMediaUploads({
    files: req.files,
    folder: `onboarding/${userId}/voices`,
    mediaType: "audio",
  });

  const result = await prisma.$transaction(async (tx) => {
    const media = await mediaDb.createManyMedia(
      uploadedItems.map((item) => ({
        ...item,
        userId,
      })),
      tx,
    );

    const existing = await onboardingDb.findProgressByUserId(userId, tx);

    const existingDraft = existing?.draftData || {};
    const existingVoices = existingDraft.voiceRecordings || [];

    const voiceIds = media.map((item) => item.id);

    const progress = await onboardingDb.upsertProgress(
      userId,
      {
        currentStep: existing?.currentStep ?? 18,
        completedSections: Array.from(
          new Set([...(existing?.completedSections || []), "voice"]),
        ),
        draftData: {
          ...existingDraft,
          voiceRecordings: [...existingVoices, ...voiceIds],
        },
        status: "IN_PROGRESS",
      },
      tx,
    );

    return { media, progress };
  });

  return res.status(201).json({
    success: true,
    message: "Voice recordings uploaded successfully",
    data: {
      voices: result.media,
      onboarding: result.progress,
    },
  });
});
