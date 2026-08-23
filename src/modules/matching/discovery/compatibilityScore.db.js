import prisma from "../../../config/prisma.js";

const dbClient = (trx = null) => trx || prisma;

export const findByViewerCandidate = async (
  { viewerId, candidateId },
  trx = null,
) => {
  const db = dbClient(trx);

  return db.compatibilityScore.findUnique({
    where: {
      viewerId_candidateId: {
        viewerId,
        candidateId,
      },
    },
  });
};

export const upsertByViewerCandidate = async (
  {
    viewerId,
    candidateId,
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
      viewerId_candidateId: {
        viewerId,
        candidateId,
      },
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
      viewerId,
      candidateId,
      score,
      identityScore,
      lifestyleScore,
      valuesScore,
      locationScore,
      reasons,
    },
  });
};
