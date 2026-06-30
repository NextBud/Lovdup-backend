import { stripeClient } from "./stripe.client.js";
import { paymentConfig } from "../payment/payment.config.js";

export const verify = ({ headers, body }) => {
  const signature = headers["stripe-signature"];

  return stripeClient.webhooks.constructEvent(
    body,
    signature,
    paymentConfig.providers.stripe.webhookSecret,
  );
};
