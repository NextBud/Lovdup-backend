import { stripeClient } from "./stripe.client.js";

export const createCheckoutSession = async ({
  purchase,
  successUrl,
  cancelUrl,
}) => {
  // Convert amount to cents (Stripe expects integers)
  const amountInCents = Math.round(purchase.amountPaid * 100);

  console.log("Creating Stripe session:", {
    purchaseId: purchase.id,
    amount: purchase.amountPaid,
    amountInCents: amountInCents,
    currency: purchase.currency,
  });

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
          currency: purchase.currency.toLowerCase(), // Stripe expects lowercase (usd, eur, etc.)
          unit_amount: amountInCents, // Now in cents!
          product_data: {
            name: "Lovd Up Coin Package",
            description: `${purchase.coinsPurchased} Coins`,
          },
        },
      },
    ],
  });
};
