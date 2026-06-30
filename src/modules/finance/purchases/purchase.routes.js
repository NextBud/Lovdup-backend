import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import * as controller from "./purchase.controller.js";

const purchaseRouter = Router();

purchaseRouter.use(authMiddleware);

purchaseRouter.post("/", controller.createPurchase);

purchaseRouter.get("/", controller.getMyPurchases);

purchaseRouter.get("/:purchaseId", controller.getPurchaseById);

export default purchaseRouter;
