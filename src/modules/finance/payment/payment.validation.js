import Joi from "joi";

export const createCheckoutSessionSchema = Joi.object({
  purchaseId: Joi.string().required().messages({
    "string.empty": "Purchase ID is required",
    "any.required": "Purchase ID is required",
  }),
});
