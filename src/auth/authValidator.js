import Joi from "joi";

export const registerSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).required(),
  phone: Joi.string().allow(null, "").optional(),
  whatsappPhone: Joi.string().allow(null, "").optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});
