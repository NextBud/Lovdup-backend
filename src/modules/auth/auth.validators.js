/**
 * auth.validators.js
 *
 * Authentication is phone-only.
 *
 * Firebase handles:
 *   - Phone number entry
 *   - OTP delivery
 *   - OTP verification
 *
 * LovdUp handles:
 *   - Firebase ID token verification
 *   - User creation / lookup
 *   - Application sessions
 *   - Access + refresh tokens
 */

import Joi from "joi";

export const phoneAuthSchema = Joi.object({
  idToken: Joi.string().trim().required(),
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().trim().required(),
});
