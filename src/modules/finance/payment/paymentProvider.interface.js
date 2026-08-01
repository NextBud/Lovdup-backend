export class PaymentProvider {
  /**
   * Create a checkout session for a purchase.
   *
   * @param {Object} payload
   * @param {Object} payload.purchase
   *
   * @returns {Promise<Object>}
   */
  async createCheckoutSession(payload) {
    throw new Error("createCheckoutSession() not implemented");
  }

  /**
   * Verify and parse an incoming webhook, returning our internal
   * PaymentEvent DTO. Each provider handles its own signature
   * verification and payload mapping internally.
   *
   * @param {Object} payload
   * @param {Object} payload.headers
   * @param {Object} payload.body
   *
   * @returns {Promise<import("../payment/paymentEvent.js").PaymentEvent>}
   */
  async handleWebhook(payload) {
    throw new Error("handleWebhook() not implemented");
  }

  /**
   * Refund an existing payment.
   *
   * @param {Object} payload
   *
   * @returns {Promise<Object>}
   */
  async refund(payload) {
    throw new Error("refund() not implemented");
  }
}
