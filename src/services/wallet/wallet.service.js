import {
  BadRequestError,
  NotFoundException,
} from "../lib/classes/errorClasses.js";
import * as walletDb from "./wallet.db.js";

export const getOrCreateWallet = async (userId, trx = null) => {
  const existing = await walletDb.findByUserId(userId, trx);

  if (existing) return existing;

  return walletDb.createForUser(userId, trx);
};

export const debitCoins = async ({
  userId,
  amount,
  reason,
  description,
  metadata = {},
  trx = null,
}) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new BadRequestError("Debit amount must be a positive integer");
  }

  const wallet = await getOrCreateWallet(userId, trx);

  if (wallet.balance < amount) {
    throw new BadRequestError("Insufficient coin balance");
  }

  const balanceBefore = wallet.balance;
  const balanceAfter = wallet.balance - amount;

  const updatedWallet = await walletDb.updateBalance({
    walletId: wallet.id,
    balance: balanceAfter,
    trx,
  });

  const transaction = await walletDb.createTransaction(
    {
      walletId: wallet.id,
      userId,
      type: "DEBIT",
      reason,
      amount,
      balanceBefore,
      balanceAfter,
      description,
      metadata,
    },
    trx,
  );

  return {
    wallet: updatedWallet,
    transaction,
  };
};

export const getMyWallet = async (userId, trx = null) => {
  return getOrCreateWallet(userId, trx);
};

export const getMyWalletTransactions = async ({
  userId,
  query = {},
  trx = null,
}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;

  return walletDb.findTransactionsByUserId({
    userId,
    page,
    limit,
    trx,
  });
};
