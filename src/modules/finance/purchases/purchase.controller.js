import asyncWrapper from "../../../lib/asyncWrapper.js";
import * as purchaseService from "./purchase.service.js";

export const createPurchase = asyncWrapper(async (req, res) => {
  const userId = req.user.id;
  const { packageId, provider, metadata } = req.body;
  
  const purchaseMetadata = metadata || {};

  const purchase = await purchaseService.createPurchase({
    userId,
    packageId,
    provider,
    metadata: purchaseMetadata,
  });

  res.status(201).json({
    success: true,
    message: "Purchase created successfully",
    data: purchase,
  });
});

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

export const getMyPurchases = asyncWrapper(async (req, res) => {
  const userId = req.user.id;
  const { page, limit, status } = req.query;

  const purchases = await purchaseService.getMyPurchases({
    userId,
    page,
    limit,
    status,
  });

  res.status(200).json({
    success: true,
    message: "Purchases fetched successfully",
    data: purchases,
  });
});

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
