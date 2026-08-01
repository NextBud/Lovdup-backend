import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../../middlewares/validator/validator.js";
import * as controller from "./purchase.controller.js";
import * as validation from "./purchase.validation.js";

const purchaseRouter = Router();

purchaseRouter.use(authMiddleware);

// Create purchase
purchaseRouter.post(
  "/",
  validateBody(validation.createPurchaseSchema),
  controller.createPurchase,
);

// Get user's purchases with pagination
purchaseRouter.get(
  "/",
  validateQuery(validation.paginationQuerySchema),
  controller.getMyPurchases,
);

// Get purchase by ID
purchaseRouter.get(
  "/:purchaseId",
  validateParams(validation.purchaseIdParamSchema),
  controller.getPurchaseById,
);

// Cancel purchase
purchaseRouter.post(
  "/:purchaseId/cancel",
  validateParams(validation.purchaseIdParamSchema),
  validateBody(validation.cancelPurchaseSchema),
  controller.cancelPurchase,
);

// Complete purchase (webhook or manual)
purchaseRouter.post(
  "/:purchaseId/complete",
  validateParams(validation.purchaseIdParamSchema),
  validateBody(validation.completePurchaseSchema),
  controller.completePurchase,
);

// Fail purchase (webhook or manual)
purchaseRouter.post(
  "/:purchaseId/fail",
  validateParams(validation.purchaseIdParamSchema),
  validateBody(validation.failPurchaseSchema),
  controller.failPurchase,
);

export default purchaseRouter;
