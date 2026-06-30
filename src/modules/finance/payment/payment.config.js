import { env } from "../../../lib/env.js";


export const paymentConfig = {
  successUrl: process.env.PAYMENT_SUCCESS_URL,
  cancelUrl: process.env.PAYMENT_CANCEL_URL,

  providers: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },

    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    },
  },
};
