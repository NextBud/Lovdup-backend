import prisma from "../../../config/prisma.js";

const dbClient = (trx) => trx || prisma;

export const findByUserPair = async ({ userAId, userBId, trx = null }) => {
  const db = dbClient(trx);

  return db.compatibilityScore.findUnique({
    where: {
      userAId_userBId: { userAId, userBId },
    },
  });
};

export const upsertByUserPair = async (
  {
    userAId,
    userBId,
    score,
    identityScore = 0,
    lifestyleScore = 0,
    valuesScore = 0,
    locationScore = 0,
    reasons = {},
  },
  trx = null,
) => {
  const db = dbClient(trx);

  return db.compatibilityScore.upsert({
    where: {
      userAId_userBId: { userAId, userBId },
    },
    update: {
      score,
      identityScore,
      lifestyleScore,
      valuesScore,
      locationScore,
      reasons,
      calculatedAt: new Date(),
    },
    create: {
      userAId,
      userBId,
      score,
      identityScore,
      lifestyleScore,
      valuesScore,
      locationScore,
      reasons,
    },
  });
};
