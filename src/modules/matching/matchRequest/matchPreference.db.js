import prisma from "../../config/prisma.js";

const dbClient = (trx) => trx || prisma;

export const findByUserId = async (userId, trx = null) => {
  const db = dbClient(trx);

  return db.matchPreference.findUnique({
    where: { userId },
  });
};

export const create = async (userId, payload, trx = null) => {
  const db = dbClient(trx);

  return db.matchPreference.create({
    data: {
      userId,
      ...payload,
    },
  });
};

export const updateByUserId = async (userId, payload, trx = null) => {
  const db = dbClient(trx);

  return db.matchPreference.update({
    where: { userId },
    data: payload,
  });
};

export const upsertByUserId = async (userId, payload, trx = null) => {
  const db = dbClient(trx);

  return db.matchPreference.upsert({
    where: { userId },
    update: payload,
    create: {
      userId,
      ...payload,
    },
  });
};

export const deleteByUserId = async (userId, trx = null) => {
  const db = dbClient(trx);

  return db.matchPreference.delete({
    where: { userId },
  });
};
