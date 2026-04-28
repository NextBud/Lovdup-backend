import prisma from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

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
    update: data,
    create: {
      userId,
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
    },
  });
};
