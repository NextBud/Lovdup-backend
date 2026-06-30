import asyncWrapper from "../../../lib/asyncWrapper.js";
import * as purchaseService from "./purchase.service.js";

/**
 * POST /api/purchases
 * Create a new purchase
 *
 * Body:
 * {
 *   packageId: string,
 *   provider: "STRIPE" | "PAYPAL",
 *   metadata?: object
 * }
 */
export const createPurchase = asyncWrapper(async (req, res) => {
  const userId = req.user.id;
  const { packageId, provider, metadata } = req.body;

  const purchase = await purchaseService.createPurchase({
    userId,
    packageId,
    provider,
    metadata,
  });

  res.status(201).json({
    success: true,
    message: "Purchase created successfully",
    data: purchase,
  });
});

/**
 * GET /api/purchases/:purchaseId
 * Get a specific purchase by ID
 */
export const getPurchaseById = asyncWrapper(async (req, res) => {
  const userId = req.user.id;
  const { purchaseId } = req.params;

  const purchase = await purchaseService.getPurchaseById(purchaseId);

  // Security check: Ensure user owns the purchase
  if (purchase.userId !== userId) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to view this purchase",
    });
  }

  res.status(200).json({
    success: true,
    message: "Purchase fetched successfully",
    data: purchase,
  });
});

/**
 * GET /api/purchases
 * Get user's purchases with pagination
 *
 * Query params:
 * ?page=1&limit=20
 */
export const getMyPurchases = asyncWrapper(async (req, res) => {
  const userId = req.user.id;

  const purchases = await purchaseService.getMyPurchases({
    userId,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    message: "Purchases fetched successfully",
    data: purchases,
  });
});

/**
 * POST /api/purchases/:purchaseId/complete
 * Complete a purchase (webhook or manual)
 *
 * Body:
 * {
 *   providerReference: string,
 *   metadata?: object
 * }
 */
export const completePurchase = asyncWrapper(async (req, res) => {
  const { purchaseId } = req.params;
  const { providerReference, metadata } = req.body;

  const purchase = await purchaseService.completePurchase({
    purchaseId,
    providerReference,
    metadata,
  });

  res.status(200).json({
    success: true,
    message: "Purchase completed successfully",
    data: purchase,
  });
});

/**
 * POST /api/purchases/:purchaseId/fail
 * Fail a purchase (webhook or manual)
 *
 * Body:
 * {
 *   metadata?: object
 * }
 */
export const failPurchase = asyncWrapper(async (req, res) => {
  const { purchaseId } = req.params;
  const { metadata } = req.body;

  const purchase = await purchaseService.failPurchase({
    purchaseId,
    metadata,
  });

  res.status(200).json({
    success: true,
    message: "Purchase failed successfully",
    data: purchase,
  });
});

/**
 * POST /api/purchases/:purchaseId/cancel
 * Cancel a pending purchase
 *
 * Body:
 * {
 *   metadata?: object
 * }
 */
export const cancelPurchase = asyncWrapper(async (req, res) => {
  const userId = req.user.id;
  const { purchaseId } = req.params;
  const { metadata } = req.body;

  // Security check: Ensure user owns the purchase
  const purchase = await purchaseService.getPurchaseById(purchaseId);
  if (purchase.userId !== userId) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to cancel this purchase",
    });
  }

  const cancelledPurchase = await purchaseService.cancelPurchase({
    purchaseId,
    metadata,
  });

  res.status(200).json({
    success: true,
    message: "Purchase cancelled successfully",
    data: cancelledPurchase,
  });
});

