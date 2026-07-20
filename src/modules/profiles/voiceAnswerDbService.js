import prisma from "../../config/prisma.js";
const dbClient = (tx) => tx || prisma;

export const createVoiceAnswers = async (answers, tx = null) => {
  const db = dbClient(tx);

  return db.voiceAnswer.createMany({
    data: answers,
    skipDuplicates: true,
  });
};

export const deleteVoiceAnswersByProfileId = async (profileId, tx = null) => {
  const db = dbClient(tx);

  return db.voiceAnswer.deleteMany({
    where: { profileId },
  });
};

export const findVoiceAnswersByProfileId = async (
  {
    profileId,
    status = null,
    category = null,
    minDuration = null,
    maxDuration = null,
  },
  tx = null,
) => {
  const db = dbClient(tx);

  const where = { profileId };

  if (status) {
    where.status = status;
  }

  if (category) {
    where.voicePrompt = { category };
  }

  if (minDuration !== null || maxDuration !== null) {
    where.durationSeconds = {};
    if (minDuration !== null) where.durationSeconds.gte = minDuration;
    if (maxDuration !== null) where.durationSeconds.lte = maxDuration;
  }

  return db.voiceAnswer.findMany({
    where,
    include: { voicePrompt: true },
    orderBy: { createdAt: "desc" },
  });
};

export const findVoiceAnswerById = async (voiceAnswerId, tx = null) => {
  const db = dbClient(tx);

  return db.voiceAnswer.findUnique({
    where: { id: voiceAnswerId },
    include: { voicePrompt: true },
  });
};
