import prisma from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

export const findProfileByUserId = async (userId, tx = null) => {
  const db = dbClient(tx);

  return db.profile.findUnique({
    where: { userId },
  });
};

export const upsertProfile = async (userId, data, tx = null) => {
  const db = dbClient(tx);

  return db.profile.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      ...data,
    },
  });
};
