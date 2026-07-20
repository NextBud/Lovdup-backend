import prisma from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

export const createReferral = async (data, tx = null) => {
  const db = dbClient(tx);
  return db.influencerReferral.create({
    data,
  });
};

export const findReferralByUserId = async (userId, tx = null) => {
  const db = dbClient(tx);
  return db.influencerReferral.findUnique({
    where: { referredUserId: userId },
  });
};

export const findReferralsByInfluencerId = async (
  influencerId,
  filters = {},
  tx = null,
) => {
  const db = dbClient(tx);
  const where = { influencerId };

  if (filters.status) {
    where.status = filters.status;
  }

  return db.influencerReferral.findMany({
    where,
    include: {
      referredUser: {
        select: {
          id: true,
          email: true,
          createdAt: true,
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
    orderBy: { createdAt: "desc" },
  });
};

export const updateReferralStatus = async (id, status, tx = null) => {
  const db = dbClient(tx);
  return db.influencerReferral.update({
    where: { id },
    data: { status },
  });
};

export const countReferralsByInfluencerId = async (
  influencerId,
  status = null,
  tx = null,
) => {
  const db = dbClient(tx);
  const where = { influencerId };

  if (status) {
    where.status = status;
  }

  return db.influencerReferral.count({
    where,
  });
};
