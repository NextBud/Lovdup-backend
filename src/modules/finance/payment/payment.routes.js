import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import * as controller from "./payment.controller.js";

const paymentRouter = Router();

paymentRouter.get("/providers", controller.getSupportedProviders);

paymentRouter.post("/checkout", authMiddleware, controller.createCheckoutSession);

paymentRouter.post("/refund", authMiddleware, controller.refund);

paymentRouter.post("/webhooks/:provider", controller.handleWebhook);

export default paymentRouter;
