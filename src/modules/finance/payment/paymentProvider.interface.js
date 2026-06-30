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
   * Verify an incoming webhook.
   *
   * Each provider has its own signature verification.
   *
   * @param {Object} payload
   *
   * @returns {Promise<Object>}
   */
  async verifyWebhook(payload) {
    throw new Error("verifyWebhook() not implemented");
  }

  /**
   * Convert provider webhook payload
   * into our internal Payment Event DTO.
   *
   * @param {Object} payload
   *
   * @returns {Promise<Object>}
   */
  async mapWebhookEvent(payload) {
    throw new Error("mapWebhookEvent() not implemented");
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
   