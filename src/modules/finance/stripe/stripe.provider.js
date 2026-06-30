import { PaymentProvider } from "../payment/paymentProvider.interface.js";
import * as checkout from "./stripe.checkout.js";
import * as webhook from "./stripe.webhook.js";
import * as mapper from "./stripe.mapper.js";

export class StripeProvider extends PaymentProvider {
  async createCheckoutSession(payload) {
    const session = await checkout.createCheckoutSession(payload);

    return {
      sessionId: session.id,

      checkoutUrl: session.url,

      expiresAt: session.expires_at,
    };
  }

  async handleWebhook(payload) {
    const event = await webhook.verify(payload);

    return mapper.toPaymentEvent(event);
  }

  async refund() {
    throw new Error("Not implemented.");
  }
}
