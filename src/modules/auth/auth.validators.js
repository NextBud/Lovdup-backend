/**
 * auth.validators.js
 *
 * Joi schemas for all auth endpoints.
 * These are used as middleware via a validate() helper,
 * or called directly in the service before processing.
 */

import Joi from "joi";

export const passwordAuthSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).required(),
  mode: Joi.string().valid("LOGIN", "REGISTER").required(),
});

export const firebaseAuthSchema = Joi.object({
  idToken: Joi.string().required(),
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});
