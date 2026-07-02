import { PaymentProvider } from "../wallet/wallet.constants.js";
import { StripeProvider } from "../stripe/stripe.provider.js";
// import { PaypalProvider } from "./providers/paypal/paypal.provider.js";

class PaymentProviderFactory {
  constructor() {
    this.providers = new Map([
      [PaymentProvider.STRIPE, new StripeProvider()],
      // [PaymentProviderEnum.PAYPAL, new PaypalProvider()],
    ]);
  }

  get(provider) {
    const paymentProvider = this.providers.get(provider);

    if (!paymentProvider) {
      throw new Error(`Unsupported payment provider: ${provider}`);
    }

    return paymentProvider;
  }
}

export const paymentProviderFactory =
  new PaymentProviderFactory();