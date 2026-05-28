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
export const saveProgress = async (userId, payload, tx = prisma) => {
  return tx.onboardingProgress.upsert({
    where: { userId },
    create: {
      userId,
      ...payload,
      maxReachedStep: payload.currentStep,
    },
    update: {
      ...payload,
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
