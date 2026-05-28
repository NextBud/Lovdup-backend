/**
 * auth.controller.js
 *
 * Thin HTTP layer only. No logic here.
 *
 * Routes:
 *   POST /auth/password          → email/password login or register
 *   POST /auth/firebase          → Google / Apple / Phone (Firebase idToken)
 *   POST /auth/refresh           → rotate refresh token, get new access token
 *   POST /auth/logout            → revoke current session
 *   POST /auth/logout-all        → revoke all sessions (all devices)
 */

import asyncWrapper from "../../lib/asyncWrapper.js";
import * as authService from "./auth.service.js";

// POST /auth/password
// Body: { email, password, mode: "LOGIN" | "REGISTER" }
export const passwordAuth = asyncWrapper(async (req, res) => {
  const { email, password, mode } = req.body;

  const result = await authService.authenticateWithPassword({
    email,
    password,
    mode,
    meta: {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    },
  });

  return res.status(200).json({
    success: true,
    data: result,
  });
});

// POST /auth/firebase
// Body: { idToken }
export const firebaseAuth = asyncWrapper(async (req, res) => {
  const { idToken } = req.body;

  const result = await authService.authenticateWithFirebase({
    idToken,
    meta: {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    },
  });

  return res.status(200).json({
    success: true,
    data: result,
  });
});

export const me = asyncWrapper(async (req, res) => {
  const result = await authService.getMe({
    userId: req.user.userId,
    sessionId: req.user.sessionId,
  });

  return res.status(200).json({
    success: true,
    data: result,
  });
});

// POST /auth/refresh
// Body: { refreshToken }
export const refresh = asyncWrapper(async (req, res) => {
  const { refreshToken } = req.body;

  const result = await authService.refreshSession({ refreshToken });

  return res.status(200).json({
    success: true,
    data: result,
  });
});

// POST /auth/logout   (requires auth)
// Revokes the current session only
export const logout = asyncWrapper(async (req, res) => {
  await authService.logout({
    userId: req.user.userId,
    sessionId: req.user.sessionId,
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

// POST /auth/logout-all   (requires auth)
// Revokes all sessions across all devices
export const logoutAll = asyncWrapper(async (req, res) => {
  await authService.logoutAll({ userId: req.user.userId });

  return res.status(200).json({
    success: true,
    message: "Logged out from all devices.",
  });
});
