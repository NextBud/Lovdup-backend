import prisma from "../../../config/prisma.js";

export const create = async (payload, db = prisma) => {
  return db.coinPurchase.create({
    data: payload,
  });
};

export const findById = async (id, db = prisma) => {
  return db.coinPurchase.findUnique({
    where: {
      id,
    },
  });
};

export const findByProviderReference = async (
  providerReference,
  db = prisma,
) => {
  return db.coinPurchase.findUnique({
    where: {
      providerReference,
    },
  });
};

export const findByUserId = async ({
  userId,
  page = 1,
  limit = 20,
  db = prisma,
}) => {
  const skip = (page - 1) * limit;

  const [purchases, total] = await Promise.all([
    db.coinPurchase.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),

    db.coinPurchase.count({
      where: {
        userId,
      },
    }),
  ]);

  return {
    purchases,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const update = async (id, data, db = prisma) => {
  return db.coinPurchase.update({
    where: {
      id,
    },
    data,
  });
};
