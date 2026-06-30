export class PaymentEvent {
  constructor({
    action,
    purchaseId,
    provider,
    providerReference,
    metadata = {},
  }) {
    this.action = action;
    this.purchaseId = purchaseId;
    this.provider = provider;
    this.providerReference = providerReference;
    this.metadata = Object.freeze(metadata);

    Object.freeze(this);
  }
}
