import prisma from "../../config/prisma.js";
import {
  CURRENT_DRAFT_VERSION,
  ONBOARDING_STATUS,
} from "./onboarding.constants.js";
import {
  mergeCompletedSections,
  sanitizeDraftData,
} from "./onboarding.helpers.js";

const db = (tx) => tx ?? prisma;

// ─────────────────────────────────────────────
// PROGRESS
// ─────────────────────────────────────────────

export const findProgressByUserId = async (userId, tx = null) => {
  return db(tx).onboardingProgress.findUnique({
    where: { userId },
  });
};

/**
 * Upsert progress — merges draft data and completed sections
 * rather than blindly overwriting them.
 */
export const saveProgress = async (userId, payload, tx = null) => {
  const client = db(tx);

  const existing = await client.onboardingProgress.findUnique({
    where: { userId },
  });

  const mergedDraftData = {
    ...(existing?.draftData || {}),
    ...sanitizeDraftData(payload.draftData),
  };

  const completedSections = mergeCompletedSections(
    existing?.completedSections ?? [],
    payload.completedSections ?? [],
  );

  return client.onboardingProgress.upsert({
    where: { userId },
    update: {
      currentStep: payload.currentStep ?? existing?.currentStep ?? 1,
      completedSections,
      draftData: mergedDraftData,
      status: ONBOARDING_STATUS.IN_PROGRESS,
    },
    create: {
      userId,
      currentStep: payload.currentStep ?? 1,
      completedSections,
      draftData: mergedDraftData,
      draftVersion: CURRENT_DRAFT_VERSION,
      status: ONBOARDING_STATUS.IN_PROGRESS,
      startedAt: new Date(),
    },
  });
};

export const markCompleted = async (userId, tx = null) => {
  return db(tx).onboardingProgress.update({
    where: { userId },
    data: {
      status: ONBOARDING_STATUS.COMPLETED,
      completedAt: new Date(),
      currentStep: 23,
      draftData: {},
    },
  });
};

export const resetProgress = async (userId, tx = null) => {
  return db(tx).onboardingProgress.upsert({
    where: { userId },
    update: {
      status: ONBOARDING_STATUS.NOT_STARTED,
      currentStep: 1,
      completedSections: [],
      draftData: {},
      startedAt: null,
      completedAt: null,
    },
    create: {
      userId,
      status: ONBOARDING_STATUS.NOT_STARTED,
      currentStep: 1,
      draftVersion: CURRENT_DRAFT_VERSION,
    },
  });
};

export const deleteProgressByUserId = async (userId, tx = null) => {
  return db(tx).onboardingProgress.deleteMany({
    where: { userId },
  });
};

// ─────────────────────────────────────────────
// STAGED MEDIA (OnboardingMedia)
// ─────────────────────────────────────────────

export const createOnboardingMedia = async (userId, items = [], tx = null) => {
  // items: Array<{ url, publicId, mimeType, size, mediaType, position?, promptId? }>
  return db(tx).onboardingMedia.createMany({
    data: items.map((item) => ({ ...item, userId })),
  });
};

export const findOnboardingMediaByUserId = async (userId, tx = null) => {
  return db(tx).onboardingMedia.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
};

export const deleteOnboardingMediaByUserId = async (userId, tx = null) => {
  return db(tx).onboardingMedia.deleteMany({
    where: { userId },
  });
};
