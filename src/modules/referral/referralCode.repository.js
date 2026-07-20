import prisma from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

export const createReferralCode = async (data, tx = null) => {
  const db = dbClient(tx);
  return db.referralCode.create({
    data,
  });
};

export const findReferralCodeById = async (id, tx = null) => {
  const db = dbClient(tx);
  return db.referralCode.findUnique({
    where: { id },
  });
};

export const findReferralCodeByCode = async (code, tx = null) => {
  const db = dbClient(tx);
  return db.referralCode.findUnique({
    where: { code },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isInfluencer: true,
          profile: {
            select: {
              identity: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
    },
  });
};

export const findReferralCodeByUserId = async (userId, tx = null) => {
  const db = dbClient(tx);
  return db.referralCode.findUnique({
    where: { userId },
  });
};

export const updateReferralCode = async (id, data, tx = null) => {
  const db = dbClient(tx);
  return db.referralCode.update({
    where: { id },
    data,
  });
};

export const deactivateReferralCode = async (id, tx = null) => {
  const db = dbClient(tx);
  return db.referralCode.update({
    where: { id },
    data: { isActive: false },
  });
};
