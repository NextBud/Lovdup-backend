import { BadRequestError } from "../../../classes/errorClasses.js";
import * as purchaseService from "../purchases/purchase.service.js";
import { paymentProviderFactory } from "../providers/paymentProviderFactory.js";
import {
  PurchaseStatus,
  PaymentProvider,
} from "../purchases/purchase.constants.js";

const handlers = {
  [PurchaseStatus.COMPLETED]: purchaseService.completePurchase,
  [PurchaseStatus.FAILED]: purchaseService.failPurchase,
  // [PurchaseStatus.REFUNDED]: purchaseService.refundPurchase,
};

export const createCheckoutSession = async ({ purchaseId }) => {
  if (!purchaseId || typeof purchaseId !== "string") {
    throw new BadRequestError("Valid purchase ID is required");
  }

  const purchase = await purchaseService.getPurchaseById(purchaseId);
  
  if (purchase.status !== PurchaseStatus.PENDING) {
    throw new BadRequestError("Purchase is no longer payable.");
  }

  const provider = paymentProviderFactory.get(purchase.provider);

  return provider.createCheckoutSession({
    purchase,
    successUrl: process.env.PAYMENT_SUCCESS_URL,
    cancelUrl: process.env.PAYMENT_CANCEL_URL,
  });
};

export const handleWebhook = async ({ provider, headers, body }) => {
  const paymentProvider = paymentProviderFactory.get(provider);

  const event = await paymentProvider.handleWebhook({
    headers,
    body,
  });

  const handler = handlers[event.action];

  if (!handler) {
    throw new BadRequestError(`Unsupported payment action: ${event.action}`);
  }

  return handler({
    purchaseId: event.purchaseId,
    providerReference: event.providerReference,
    metadata: event.metadata,
  });
};

// export const refund = async ({ purchaseId }) => {
//   const purchase = await purchaseService.getPurchaseById(purchaseId);

//   const provider = paymentProviderFactory.get(purchase.provider);

//   return provider.refund({
//     purchase,
//   });
// };

export const getSupportedProviders = () => {
  return paymentProviderFactory.list();
};
