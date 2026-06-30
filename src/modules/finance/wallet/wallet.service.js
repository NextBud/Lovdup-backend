import prisma from "../../../config/prisma.js";
import {
  WalletTransactionType,
  WalletTransactionReason,
  WalletReferenceType,
} from "./wallet.constants.js";
import * as walletDb from "./walletDbService.js";
import {
  BadRequestError,
  NotFoundException,
} from "../../../classes/errorClasses.js";

/**
 * Initialize a new wallet for a user with welcome bonus
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created wallet
 */
export const initializeWallet = async (userId) => {
  return prisma.$transaction(async (trx) => {
    // Create wallet with zero balance
    const wallet = await walletDb.createForUser(userId, trx);

    // Credit welcome bonus through applyTransaction
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

/**
 * Credit coins to a user's wallet
 * @param {Object} payload - Credit payload
 * @param {string} payload.userId - User ID
 * @param {number} payload.coins - Number of coins to credit
 * @param {string} payload.reason - Transaction reason
 * @param {string} [payload.referenceType] - Reference type
 * @param {string} [payload.referenceId] - Reference ID
 * @param {Object} [payload.metadata] - Additional metadata
 * @param {Object} [payload.db] - Database/transaction client
 * @returns {Promise<Object>} Transaction receipt
 */
export const creditCoins = async (payload) => {
  return applyTransaction({
    ...payload,
    type: WalletTransactionType.CREDIT,
  });
};

/**
 * Debit coins from a user's wallet
 * @param {Object} payload - Debit payload
 * @param {string} payload.userId - User ID
 * @param {number} payload.coins - Number of coins to debit
 * @param {string} payload.reason - Transaction reason
 * @param {string} [payload.referenceType] - Reference type
 * @param {string} [payload.referenceId] - Reference ID
 * @param {Object} [payload.metadata] - Additional metadata
 * @param {Object} [payload.db] - Database/transaction client
 * @returns {Promise<Object>} Transaction receipt
 */
export const debitCoins = async (payload) => {
  return applyTransaction({
    ...payload,
    type: WalletTransactionType.DEBIT,
  });
};

/**
 * Get user's wallet
 * @param {string} userId - User ID
 * @param {Object} [db] - Database/transaction client
 * @returns {Promise<Object>} Wallet
 * @throws {NotFoundException} If wallet doesn't exist
 */
export const getMyWallet = async (userId, db = null) => {
  const wallet = await walletDb.findByUserId(userId, db || prisma);

  if (!wallet) {
    throw new NotFoundException("Wallet not found");
  }

  return wallet;
};

/**
 * Get wallet transactions with pagination
 * @param {Object} params - Query parameters
 * @param {string} params.userId - User ID
 * @param {Object} params.query - Query params with page and limit
 * @param {Object} [params.db] - Database/transaction client
 * @returns {Promise<Object>} Paginated transactions
 */
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

/**
 * Refund coins to a user's wallet
 * @param {Object} payload - Refund payload
 * @param {string} payload.userId - User ID
 * @param {number} payload.coins - Number of coins to refund
 * @param {string} [payload.reason] - Transaction reason (defaults to REFUND)
 * @param {string} [payload.referenceType] - Reference type
 * @param {string} [payload.referenceId] - Reference ID
 * @param {Object} [payload.metadata] - Additional metadata
 * @param {Object} [payload.db] - Database/transaction client
 * @returns {Promise<Object>} Transaction receipt
 */
export const refundCoins = async (payload) => {
  return applyTransaction({
    ...payload,
    type: WalletTransactionType.CREDIT,
    reason: payload.reason || WalletTransactionReason.REFUND,
    metadata: { ...payload.metadata, refund: true },
  });
};

/**
 * Private helper to apply a transaction to a wallet
 * This is the ONLY place that mutates wallet balances
 *
 * @param {Object} params - Transaction parameters
 * @param {string} params.userId - User ID
 * @param {string} params.type - Transaction type (CREDIT or DEBIT)
 * @param {number} params.coins - Number of coins
 * @param {string} params.reason - Transaction reason
 * @param {string} [params.referenceType] - Reference type
 * @param {string} [params.referenceId] - Reference ID
 * @param {Object} [params.metadata] - Additional metadata
 * @param {Object} [params.db] - Database/transaction client
 * @returns {Promise<Object>} Transaction receipt
 * @throws {BadRequestError} If coins is not a positive integer
 * @throws {NotFoundException} If wallet doesn't exist
 * @throws {BadRequestError} If insufficient balance for debit
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
  // Validate coin amount
  if (!Number.isInteger(coins) || coins <= 0) {
    throw new BadRequestError("Coins must be a positive integer");
  }

  // Determine if we need to create a new transaction
  const shouldCreateTransaction = !db;

  // If no db client provided, create a new transaction
  if (shouldCreateTransaction) {
    return prisma.$transaction(async (trx) => {
      return await executeTransaction({
        userId,
        type,
        coins,
        reason,
        referenceType,
        referenceId,
        metadata,
        db: trx,
      });
    });
  }

  // Reuse existing transaction
  return await executeTransaction({
    userId,
    type,
    coins,
    reason,
    referenceType,
    referenceId,
    metadata,
    db,
  });
};

/**
 * Execute the actual transaction logic
 * This is the core business logic for wallet mutations
 *
 * @param {Object} params - Transaction execution parameters
 * @returns {Promise<Object>} Transaction receipt
 */

// Preserve backward compatibility
export const applyTransactionWithDb = applyTransaction;

// Export for testing
export const __applyTransaction = applyTransaction;
