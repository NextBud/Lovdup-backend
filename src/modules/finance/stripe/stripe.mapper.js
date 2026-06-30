import { PaymentEvent } from "../payment/paymentEvent.js";

import {
  CoinPurchaseStatus,
  PaymentProvider,
} from "../wallet/wallet.constants.js";

export const toPaymentEvent = (event) => {
  switch (event.type) {
    case "checkout.session.completed":
      return new PaymentEvent({
        action: CoinPurchaseStatus.COMPLETE,

        provider: PaymentProviderEnum.STRIPE,

        purchaseId: event.data.object.metadata.purchaseId,

        providerReference: event.data.object.id,

        metadata: {
          paymentIntent: event.data.object.payment_intent,
        },
      });

    case "checkout.session.async_payment_failed":
      return new PaymentEvent({
        action: CoinPurchaseStatus.FAILED,

        provider: PaymentProviderEnum.STRIPE,

        purchaseId: event.data.object.metadata.purchaseId,

        providerReference: event.data.object.id,
      });

    default:
      throw new Error(`Unsupported Stripe event: ${event.type}`);
  }
};
