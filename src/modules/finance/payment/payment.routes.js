import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import * as controller from "./payment.controller.js";
import { validateBody } from "../../../middlewares/validator/validator.js";
import {createCheckoutSessionSchema} from "./payment.validation.js"

const paymentRouter = Router();

paymentRouter.get("/", controller.getSupportedProviders);
paymentRouter.post(
  "/checkout",
  validateBody(createCheckoutSessionSchema),
  controller.createCheckoutSession,
);
paymentRouter.post("/refund", authMiddleware, controller.refund);

export default paymentRouter;
