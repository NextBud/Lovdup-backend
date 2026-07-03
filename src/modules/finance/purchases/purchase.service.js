import prisma from "../../../config/prisma.js";
import {
  BadRequestError,
  NotFoundException,
} from "../../../classes/errorClasses.js";
import * as purchaseDb from "./purchaseDbService.js";
import * as coinPackageService from "../coin-packages/coinPackage.service.js";
import * as walletService from "../wallet/wallet.service.js";
import { PaymentProvider, PurchaseStatus } from "./purchase.constants.js";

/*
|--------------------------------------------------------------------------
| Public API
|--------------------------------------------------------------------------
*/

/**
 * Create a new purchase
 * @param {Object} params - Purchase creation parameters
 * @param {string} params.userId - User ID
 * @param {string} params.packageId - Coin package ID
 * @param {string} params.provider - Payment provider (STRIPE or PAYPAL)
 * @param {Object} [params.metadata] - Additional metadata
 * @param {Object} [params.db] - Database/transaction client
 * @returns {Promise<Object>} Created purchase
 */
export const createPurchase = async ({
  userId,
  packageId,
  provider,
  metadata = {},
  db = prisma,
}) => {
  // Validate provider
  if (!Object.values(PaymentProvider).includes(provider)) {
    throw new BadRequestError("Invalid payment provider");
  }

  // Get package details (coinPackage service handles validation)
  const coinPackage = coinPackageService.getPackageById(packageId);

  // Create purchase with PENDING status
  return purchaseDb.create(
    {
      userId,
      provider,
      packageId,
      coinsPurchased: coinPackage.coins,
      amountPaid: coinPackage.price,
      currency: coinPackage.currency,
      status: PurchaseStatus.PENDING,
      metadata,
    },
    db,
  );
};

/**
 * Get purchase by ID
 * @param {string} purchaseId - Purchase ID
 * @param {Object} [db] - Database/transaction client
 * @returns {Promise<Object>} Purchase
 * @throws {NotFoundException} If purchase doesn't exist
 */
export const getPurchaseById = async (purchaseId, db = prisma) => {
  const purchase = await purchaseDb.findById(purchaseId, db);

  if (!purchase) {
    throw new NotFoundException("Purchase not found");
  }

  return purchase;
};

/**
 * Get user's purchases with pagination
 * @param {Object} params - Query parameters
 * @param {string} params.userId - User ID
 * @param {Object} [params.query] - Query params with page and limit
 * @param {Object} [params.db] - Database/transaction client
 * @returns {Promise<Object>} Paginated purchases
 */
export const getMyPurchases = async ({ userId, query = {}, db = prisma }) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;

  return purchaseDb.findByUserId({
    userId,
    page,
    limit,
    db,
  });
};

/**
 * Complete a purchase (orchestrates state transition + wallet credit)
 * @param {Object} params - Completion parameters
 * @param {string} params.purchaseId - Purchase ID
 * @param {string} params.providerReference - Provider's reference ID (must be unique)
 * @param {Object} [params.metadata] - Additional metadata to merge
 * @returns {Promise<Object>} Completed purchase
 * @throws {BadRequestError} If providerReference is invalid
 */
export const completePurchase = async ({
  purchaseId,
  providerReference,
  metadata = {},
}) => {
  // Validate providerReference
  if (
    !providerReference ||
    typeof providerReference !== "string" ||
    !providerReference.trim()
  ) {
    throw new BadRequestError("Valid providerReference is required");
  }

  return prisma.$transaction(async (trx) => {
    // 1. Attempt to complete the purchase record
    const { purchase, transitioned } = await completePurchaseRecord({
      purchaseId,
      providerReference,
      metadata,
      db: trx,
    });

    // 2. If no transition occurred (already terminal), return the purchase
    if (!transitioned) {
      return purchase;
    }

    // 3. Credit the wallet (only for newly completed purchases)
    await walletService.creditPurchase({
      userId: purchase.userId,
      purchaseId: purchase.id,
      coins: purchase.coinsPurchased,
      db: trx,
    });

    // 4. Return the completed purchase
    return purchase;
  });
};

/**
 * Fail a purchase
 * @param {Object} params - Failure parameters
 * @param {string} params.purchaseId - Purchase ID
 * @param {Object} [params.metadata] - Additional metadata to merge
 * @param {Object} [params.db] - Database/transaction client
 * @returns {Promise<Object>} Failed purchase
 */
export const failPurchase = async ({
  purchaseId,
  metadata = {},
  db = prisma,
}) => {
  const purchase = await getPurchaseById(purchaseId, db);

  // If not pending, return as-is (idempotent)
  if (purchase.status !== PurchaseStatus.PENDING) {
    return purchase;
  }

  // Update to FAILED with timestamp
  return purchaseDb.update(
    purchase.id,
    {
      status: PurchaseStatus.FAILED,
      failedAt: new Date(),
      metadata: {
        ...purchase.metadata,
        ...metadata,
      },
    },
    db,
  );
};

/**
 * Cancel a purchase
 * @param {Object} params - Cancellation parameters
 * @param {string} params.purchaseId - Purchase ID
 * @param {Object} [params.metadata] - Additional metadata to merge
 * @param {Object} [params.db] - Database/transaction client
 * @returns {Promise<Object>} Cancelled purchase
 */
export const cancelPurchase = async ({
  purchaseId,
  metadata = {},
  db = prisma,
}) => {
  const purchase = await getPurchaseById(purchaseId, db);

  // If not pending, return as-is (idempotent)
  if (purchase.status !== PurchaseStatus.PENDING) {
    return purchase;
  }

  // Update to CANCELLED with timestamp
  return purchaseDb.update(
    purchase.id,
    {
      status: PurchaseStatus.CANCELLED,
      cancelledAt: new Date(),
      metadata: {
        ...purchase.metadata,
        ...metadata,
      },
    },
    db,
  );
};

/*
|--------------------------------------------------------------------------
| Private Helpers
|--------------------------------------------------------------------------
*/

/**
 * Complete a purchase record (state transition only)
 * This helper handles the purchase state machine logic
 *
 * @param {Object} params - Completion parameters
 * @param {string} params.purchaseId - Purchase ID
 * @param {string} params.providerReference - Provider's reference ID
 * @param {Object} [params.metadata] - Additional metadata to merge
 * @param {Object} [params.db] - Database/transaction client
 * @returns {Promise<{purchase: Object, transitioned: boolean}>}
 *          Purchase and whether transition occurred
 */
const completePurchaseRecord = async ({
  purchaseId,
  providerReference,
  metadata = {},
  db = prisma,
}) => {
  // Load the purchase
  const purchase = await getPurchaseById(purchaseId, db);

  // Check if purchase is already in a terminal state
  const terminalStates = [
    PurchaseStatus.COMPLETED,
    PurchaseStatus.FAILED,
    PurchaseStatus.CANCELLED,
    PurchaseStatus.REFUNDED,
  ];

  if (terminalStates.includes(purchase.status)) {
    // Purchase is already terminal - no transition
    return {
      purchase,
      transitioned: false,
    };
  }

  // Only PENDING can transition to COMPLETED
  if (purchase.status !== PurchaseStatus.PENDING) {
    // Unexpected state - log but don't throw
    console.warn(
      `Unexpected purchase status: ${purchase.status} for purchase ${purchaseId}`,
    );
    return {
      purchase,
      transitioned: false,
    };
  }

  // Verify providerReference uniqueness (should be enforced by DB unique constraint)
  // Additional validation in case DB constraint isn't enough
  const existingPurchase = await purchaseDb.findByProviderReference(
    providerReference,
    db,
  );

  if (existingPurchase && existingPurchase.id !== purchaseId) {
    throw new BadRequestError(
      "Provider reference already used for another purchase",
    );
  }

  // Transition PENDING → COMPLETED
  const updatedPurchase = await purchaseDb.update(
    purchase.id,
    {
      status: PurchaseStatus.COMPLETED,
      providerReference,
      completedAt: new Date(),
      metadata: {
        ...purchase.metadata,
        ...metadata,
      },
    },
    db,
  );

  return {
    purchase: updatedPurchase,
    transitioned: true,
  };
};
