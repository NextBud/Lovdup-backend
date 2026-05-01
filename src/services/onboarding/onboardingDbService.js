import prisma from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;
const DEFAULT_DRAFT_VERSION = 1;

export const findProgressByUserId = async (userId, tx = null) => {
  const db = dbClient(tx);

  return db.onboardingProgress.findUnique({
    where: { userId },
  });
};

export const upsertProgress = async (userId, data, tx = null) => {
  const db = dbClient(tx);

  return db.onboardingProgress.upsert({
    where: { userId },
    update: {
      ...data,
      draftVersion: data.draftVersion ?? DEFAULT_DRAFT_VERSION,
    },
    create: {
      userId,
      draftVersion: data.draftVersion ?? DEFAULT_DRAFT_VERSION,
      startedAt: data.startedAt ?? new Date(),
      ...data,
    },
  });
};

export const markCompleted = async (userId, tx = null) => {
  const db = dbClient(tx);

  return db.onboardingProgress.update({
    where: { userId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      currentStep: 23,
      draftData: {},
    },
  });
};

export const deleteProgressByUserId = async (userId, tx = null) => {
  const db = dbClient(tx);

  return db.onboardingProgress.deleteMany({
    where: { userId },
  });
};
