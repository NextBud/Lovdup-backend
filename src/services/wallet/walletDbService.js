import prisma from "../../config/prisma.js";

const dbClient = (trx) => trx || prisma;

export const findByUserId = async (userId, trx = null) => {
  const db = dbClient(trx);

  return db.wallet.findUnique({
    where: { userId },
  });
};

export const createForUser = async (userId, trx = null) => {
  const db = dbClient(trx);

  return db.wallet.create({
    data: {
      userId,
      balance: 0,
    },
  });
};

export const findTransactionsByUserId = async ({
  userId,
  page = 1,
  limit = 20,
  trx = null,
}) => {
  const db = dbClient(trx);
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    db.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),

    db.walletTransaction.count({
      where: { userId },
    }),
  ]);

  return {
    transactions,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const updateBalance = async ({ walletId, balance, trx = null }) => {
  const db = dbClient(trx);

  return db.wallet.update({
    where: { id: walletId },
    data: { balance },
  });
};

export const decrementBalance = async ({ walletId, amount, trx = null }) => {
  const db = dbClient(trx);

  const result = await db.wallet.updateMany({
    where: {
      id: walletId,
      balance: {
        gte: amount,
      },
    },
    data: {
      balance: {
        decrement: amount,
      },
    },
  });

  return result.count;
};

export const incrementBalance = async ({ walletId, amount, trx = null }) => {
  const db = dbClient(trx);

  return db.wallet.update({
    where: { id: walletId },
    data: {
      balance: {
        increment: amount,
      },
    },
  });
};

export const createTransaction = async (payload, trx = null) => {
  const db = dbClient(trx);

  return db.walletTransaction.create({
    data: payload,
  });
};
