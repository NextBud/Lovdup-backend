// src/modules/influencers/influencerEarning.repository.js
import prisma from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

export const createEarning = async (data, tx = null) => {
  const db = dbClient(tx);
  return db.influencerEarning.create({
    data,
  });
};

export const findEarningByPurchaseId = async (purchaseId, tx = null) => {
  const db = dbClient(tx);
  return db.influencerEarning.findFirst({
    where: { purchaseId },
  });
};

export const findEarningsByInfluencerId = async (
  influencerId,
  filters = {},
  tx = null,
) => {
  const db = dbClient(tx);
  const where = { influencerId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.startDate) {
    where.createdAt = { gte: new Date(filters.startDate) };
  }

  if (filters.endDate) {
    where.createdAt = { ...where.createdAt, lte: new Date(filters.endDate) };
  }

  return db.influencerEarning.findMany({
    where,
    include: {
      referredUser: {
        select: {
          id: true,
          email: true,
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
      purchase: true,
      payout: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const aggregateEarningsByInfluencerId = async (
  influencerId,
  status = null,
  tx = null,
) => {
  const db = dbClient(tx);
  const where = { influencerId };

  if (status) {
    where.status = status;
  }

  return db.influencerEarning.aggregate({
    where,
    _sum: {
      commissionAmount: true,
    },
  });
};

export const updateEarningStatus = async (ids, data, tx = null) => {
  const db = dbClient(tx);
  return db.influencerEarning.updateMany({
    where: {
      id: { in: ids },
    },
    data,
  });
};
