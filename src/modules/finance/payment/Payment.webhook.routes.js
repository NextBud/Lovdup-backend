import { Router } from "express";
import express from "express";
import * as controller from "./payment.controller.js";

// This router must be mounted BEFORE express.json() in app.js.
// Stripe (and other providers') webhook signature verification requires
// the raw, unparsed request body — once express.json() runs, the body
// is already a parsed object and signature verification will fail.
const paymentWebhookRouter = Router();

paymentWebhookRouter.post(
  "/:provider",
  express.raw({ type: "application/json" }),
  controller.handleWebhook,
);

export default paymentWebhookRouter;
