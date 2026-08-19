import Joi from "joi";

export const createPurchaseSchema = Joi.object({
  packageId: Joi.string()
    .pattern(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    )
    .required()
    .messages({
      "string.empty": "Package ID is required",
      "string.pattern.base": "Package ID must be a valid UUID",
      "any.required": "Package ID is required",
    }),
  provider: Joi.string().valid("STRIPE", "PAYPAL").required().messages({
    "string.empty": "Provider is required",
    "any.only": "Provider must be either STRIPE or PAYPAL",
    "any.required": "Provider is required",
  }),
  metadata: Joi.object().optional().default({}),
});


// Schema for completing a purchase
export const completePurchaseSchema = Joi.object({
  providerReference: Joi.string().required().messages({
    "string.empty": "Provider reference is required",
    "any.required": "Provider reference is required",
  }),
  metadata: Joi.object().optional(),
});

// Schema for failing a purchase
export const failPurchaseSchema = Joi.object({
  metadata: Joi.object().optional(),
});

// Schema for cancelling a purchase
export const cancelPurchaseSchema = Joi.object({
  metadata: Joi.object().optional(),
});

// Schema for purchase ID param
export const purchaseIdParamSchema = Joi.object({
  purchaseId: Joi.string().required().messages({
    "string.empty": "Purchase ID is required",
    "any.required": "Purchase ID is required",
  }),
});

// Schema for pagination query params
export const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page must be a number",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    "number.base": "Limit must be a number",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 100",
  }),
  status: Joi.string()
    .valid("PENDING", "COMPLETED", "FAILED", "CANCELLED")
    .optional(),
});
