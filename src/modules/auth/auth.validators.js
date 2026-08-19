import Joi from "joi";

export const phoneAuthSchema = Joi.object({
  idToken: Joi.string().trim().required(),
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().trim().required(),
});

export const emailAuthSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
});