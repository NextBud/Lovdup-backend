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
