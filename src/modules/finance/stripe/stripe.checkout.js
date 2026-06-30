import { stripeClient } from "./stripe.client.js";

export const createCheckoutSession = async ({
  purchase,
  successUrl,
  cancelUrl,
}) => {
  return stripeClient.checkout.sessions.create({
    mode: "payment",

    success_url: successUrl,

    cancel_url: cancelUrl,

    payment_method_types: ["card"],

    client_reference_id: purchase.id,

    metadata: {
      purchaseId: purchase.id,

      userId: purchase.userId,

      packageId: purchase.packageId,
    },

    line_items: [
      {
        quantity: 1,

        price_data: {
          currency: purchase.currency,

          unit_amount: purchase.amountPaid,

          product_data: {
            name: "Lovd Up Coin Package",

            description: `${purchase.coinsPurchased} Coins`,
          },
        },
      },
    ],
  });
};
