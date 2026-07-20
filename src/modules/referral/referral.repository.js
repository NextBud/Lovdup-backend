import prisma from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

export const createReferral = async (data, tx = null) => {
  const db = dbClient(tx);
  return db.referral.create({
    data,
  });
};

export const findReferralById = async (id, tx = null) => {
  const db = dbClient(tx);
  return db.referral.findUnique({
    where: { id },
    include: {
      referrer: {
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
      referralCode: true,
      reward: true,
    },
  });
};

export const findReferralByReferredUser = async (referredUserId, tx = null) => {
  const db = dbClient(tx);
  return db.referral.findUnique({
    where: { referredUserId },
    include: {
      referrer: {
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
      referralCode: true,
    },
  });
};

export const findReferralsByReferrer = async (
  referrerId,
  filters = {},
  tx = null,
) => {
  const db = dbClient(tx);
  const where = { referrerId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.startDate) {
    where.createdAt = { gte: new Date(filters.startDate) };
  }

  if (filters.endDate) {
    where.createdAt = { ...where.createdAt, lte: new Date(filters.endDate) };
  }

  return db.referral.findMany({
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
      reward: true,
      referralCode: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const updateReferral = async (id, data, tx = null) => {
  const db = dbClient(tx);
  return db.referral.update({
    where: { id },
    data,
  });
};

export const updateReferralStatus = async (id, status, tx = null) => {
  const db = dbClient(tx);
  return db.referral.update({
    where: { id },
    data: { status },
  });
};

export const countReferralsByReferrer = async (
  referrerId,
  status = null,
  tx = null,
) => {
  const db = dbClient(tx);
  const where = { referrerId };

  if (status) {
    where.status = status;
  }

  return db.referral.count({
    where,
  });
};

export const findReferralByCode = async (code, tx = null) => {
  const db = dbClient(tx);
  return db.referral.findFirst({
    where: {
      referralCode: {
        code,
      },
    },
    include: {
      referrer: {
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
      referralCode: true,
    },
  });
};
