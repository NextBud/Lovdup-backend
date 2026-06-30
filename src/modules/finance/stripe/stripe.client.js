import Stripe from "stripe";
import { paymentConfig } from "../payment/payment.config.js";

export const stripeClient = new Stripe(
  paymentConfig.providers.stripe.secretKey,
  {
    apiVersion: "2025-06-30.basil",
  },
);
