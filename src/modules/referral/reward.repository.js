import prisma from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

export const createReward = async (data, tx = null) => {
  const db = dbClient(tx);
  return db.referralReward.create({
    data,
  });
};

export const findRewardById = async (id, tx = null) => {
  const db = dbClient(tx);
  return db.referralReward.findUnique({
    where: { id },
  });
};

export const findByReferralId = async (referralId, tx = null) => {
  const db = dbClient(tx);
  return db.referralReward.findUnique({
    where: { referralId },
  });
};

export const updateReward = async (id, data, tx = null) => {
  const db = dbClient(tx);
  return db.referralReward.update({
    where: { id },
    data,
  });
};

export const findPendingRewards = async (tx = null) => {
  const db = dbClient(tx);
  return db.referralReward.findMany({
    where: {
      status: "PENDING",
    },
    include: {
      referral: {
        include: {
          referrer: true,
          referredUser: true,
        },
      },
    },
  });
};
