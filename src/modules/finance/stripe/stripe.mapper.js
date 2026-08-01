import { PaymentEvent } from "../payment/paymentEvent.js";
import {
  CoinPurchaseStatus,
  PaymentProvider,
} from "../wallet/wallet.constants.js";

export const toPaymentEvent = (event) => {
  console.log("Mapping Stripe event:", event.type);
  console.log("Event data:", event.data.object);

  switch (event.type) {
    case "checkout.session.completed":
      return new PaymentEvent({
        action: CoinPurchaseStatus.COMPLETED,
        provider: PaymentProvider.STRIPE,
        purchaseId: event.data.object.metadata.purchaseId,
        providerReference: event.data.object.id,
        metadata: {
          paymentIntent: event.data.object.payment_intent,
          customer: event.data.object.customer,
          amountTotal: event.data.object.amount_total,
          currency: event.data.object.currency,
        },
      });

    case "checkout.session.async_payment_failed":
      return new PaymentEvent({
        action: CoinPurchaseStatus.FAILED,
        provider: PaymentProvider.STRIPE,
        purchaseId: event.data.object.metadata.purchaseId,
        providerReference: event.data.object.id,
        metadata: {
          paymentIntent: event.data.object.payment_intent,
          failureReason:
            event.data.object.payment_intent?.last_payment_error?.message,
        },
      });

    default:
      throw new Error(`Unsupported Stripe event: ${event.type}`);
  }
};
