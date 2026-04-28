import prisma from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

export const createWallet = async ({ userId, balance = 0 }, tx = null) => {
  const db = dbClient(tx);

  return db.wallet.create({
    data: {
      userId,
      balance,
    },
  });
};
