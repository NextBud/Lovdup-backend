import { PaymentProvider } from "../wallet/wallet.constants.js";
import { StripeProvider } from "../stripe/stripe.provider.js";
// import { PaypalProvider } from "./providers/paypal/paypal.provider.js";

class PaymentProviderFactory {
  constructor() {
    this.providers = new Map([
      [PaymentProvider.STRIPE, new StripeProvider()],
      // [PaymentProvider.PAYPAL, new PaypalProvider()],
    ]);
  }

  /**
   * Resolve a provider instance by name.
   * @param {string} provider
   * @returns {import("../payment/paymentProvider.interface.js").PaymentProvider}
   */
  get(provider) {
    const paymentProvider = this.providers.get(provider);

    if (!paymentProvider) {
      throw new Error(`Unsupported payment provider: ${provider}`);
    }

    return paymentProvider;
  }

  /**
   * List the keys of all registered/supported providers.
   * @returns {string[]}
   */
  list() {
    return Array.from(this.providers.keys());
  }
}

export const paymentProviderFactory = new PaymentProviderFactory();
