import prisma from "../../../config/prisma.js";
import {
  BadRequestError,
  NotFoundException,
} from "../../../classes/errorClasses.js";
import * as walletDb from "./walletDbService.js";
import {
  WalletTransactionType,
  WalletTransactionReason,
  WalletReferenceType,
} from "./wallet.constants.js";

export const initializeWallet = async (userId) => {
  return prisma.$transaction(async (trx) => {
    const wallet = await walletDb.createForUser(userId, trx);

    await applyTransaction({
      userId,
      type: WalletTransactionType.CREDIT,
      coins: 15,
      reason: WalletTransactionReason.WELCOME_BONUS,
      referenceType: WalletReferenceType.SYSTEM,
      referenceId: null,
      metadata: { welcome: true },
      db: trx,
    });

    return wallet;
  });
};

export const creditCoins = async (payload) => {
  return applyTransaction({
    ...payload,
    type: WalletTransactionType.CREDIT,
  });
};

export const debitCoins = async (payload) => {
  return applyTransaction({
    ...payload,
    type: WalletTransactionType.DEBIT,
  });
};

export const refundCoins = async (payload) => {
  return applyTransaction({
    ...payload,
    type: WalletTransactionType.CREDIT,
    reason: payload.reason || WalletTransactionReason.REFUND,
    metadata: { ...payload.metadata, refund: true },
  });
};

/**
 * Credit coins for a completed coin purchase.
 * Called by purchase.service.js inside its transaction.
 */
export const creditPurchase = async ({ userId, purchaseId, coins, db }) => {
  return applyTransaction({
    userId,
    type: WalletTransactionType.CREDIT,
    coins,
    reason: WalletTransactionReason.COIN_PURCHASE,
    referenceType: WalletReferenceType.PURCHASE,
    referenceId: purchaseId,
    db,
  });
};

export const getMyWallet = async (userId, db = null) => {
  const wallet = await walletDb.findByUserId(userId, db || prisma);

  if (!wallet) {
    throw new NotFoundException("Wallet not found");
  }

  return wallet;
};

export const getMyWalletTransactions = async ({
  userId,
  query = {},
  db = null,
}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;

  return walletDb.findTransactionsByUserId({
    userId,
    page,
    limit,
    db: db || prisma,
  });
};

/*
|--------------------------------------------------------------------------
| Private
|--------------------------------------------------------------------------
*/

const applyTransaction = async ({
  userId,
  type,
  coins,
  reason,
  referenceType = null,
  referenceId = null,
  metadata = {},
  db = null,
}) => {
  if (!Number.isInteger(coins) || coins <= 0) {
    throw new BadRequestError("Coins must be a positive integer");
  }

  const execute = async (trx) => {
    // 1. Load wallet
    const wallet = await walletDb.findByUserId(userId, trx);
    if (!wallet) {
      throw new NotFoundException("Wallet not found");
    }

    // 2. Compute new balance
    let newBalance;
    if (type === WalletTransactionType.DEBIT) {
      if (wallet.balance < coins) {
        throw new BadRequestError("Insufficient wallet balance");
      }
      newBalance = wallet.balance - coins;
    } else {
      newBalance = wallet.balance + coins;
    }

    // 3. Update balance
    await walletDb.updateBalance({
      walletId: wallet.id,
      balance: newBalance,
      db: trx,
    });

    // 4. Record transaction
    return walletDb.createTransaction(
      {
        userId,
        walletId: wallet.id,
        type,
        coins,
        reason,
        referenceType,
        referenceId,
        balanceAfter: newBalance,
        metadata,
      },
      trx,
    );
  };

  // Reuse caller's transaction if provided, otherwise open a new one
  if (db) {
    return execute(db);
  }

  return prisma.$transaction(execute);
};
