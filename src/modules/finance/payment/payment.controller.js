import asyncWrapper from "../../../lib/asyncWrapper.js";
import * as paymentService from "./payment.service.js";

export const createCheckoutSession = asyncWrapper(async (req, res) => {
  console.log("Request body:", req.body);
  console.log("purchaseId type:", typeof req.body.purchaseId);
  console.log("purchaseId value:", req.body.purchaseId);

  const { purchaseId } = req.body;

  // Additional validation
  if (!purchaseId) {
    return res.status(400).json({
      success: false,
      message: "Purchase ID is required",
    });
  }

  const session = await paymentService.createCheckoutSession({
    purchaseId,
  });

  res.status(200).json({
    success: true,
    message: "Checkout session created.",
    data: session,
  });
});

export const handleWebhook = asyncWrapper(async (req, res) => {
  await paymentService.handleWebhook({
    provider: req.params.provider,

    headers: req.headers,

    body: req.body,
  });

  res.sendStatus(200);
});

export const refund = asyncWrapper(async (req, res) => {
  const { purchaseId } = req.body;

  const refund = await paymentService.refund({
    purchaseId,
  });

  res.status(200).json({
    success: true,

    message: "Refund processed.",

    data: refund,
  });
});

export const getSupportedProviders = asyncWrapper(async (req, res) => {
  const providers = paymentService.getSupportedProviders();

  res.status(200).json({
    success: true,

    message: "Supported providers.",

    data: providers,
  });
});
