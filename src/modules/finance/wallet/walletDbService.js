import prisma from "../../../config/prisma.js";

/**
 * Find a wallet by user ID.
 * @param {string} userId
 * @param {Object} [db] - Prisma client or transaction client
 * @returns {Promise<Object|null>}
 */
export const findByUserId = async (userId, db = prisma) => {
  return db.wallet.findUnique({
    where: {
      userId,
    },
  });
};

/**
 * Create a new wallet for a user with a zero balance.
 * @param {string} userId
 * @param {Object} [db] - Prisma client or transaction client
 * @returns {Promise<Object>}
 */
export const createForUser = async (userId, db = prisma) => {
  return db.wallet.create({
    data: {
      userId,
      balance: 0,
    },
  });
};

/**
 * Update a wallet's balance.
 * @param {Object} params
 * @param {string} params.walletId
 * @param {number} params.balance
 * @param {Object} [params.db] - Prisma client or transaction client
 * @returns {Promise<Object>}
 */
export const updateBalance = async ({ walletId, balance, db = prisma }) => {
  return db.wallet.update({
    where: {
      id: walletId,
    },
    data: {
      balance,
    },
  });
};

/**
 * Record a wallet transaction.
 * @param {Object} payload
 * @param {Object} [db] - Prisma client or transaction client
 * @returns {Promise<Object>}
 */
export const createTransaction = async (payload, db = prisma) => {
  return db.walletTransaction.create({
    data: payload,
  });
};

/**
 * Find a user's wallet transactions with pagination.
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {Object} [params.db] - Prisma client or transaction client
 * @returns {Promise<Object>} Paginated transactions
 */
export const findTransactionsByUserId = async ({
  userId,
  page = 1,
  limit = 20,
  db = prisma,
}) => {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    db.walletTransaction.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),

    db.walletTransaction.count({
      where: {
        userId,
      },
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
