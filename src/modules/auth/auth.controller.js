/**
 * auth.controller.js
 *
 * Thin HTTP layer only.
 *
 * Routes:
 *   POST /auth/phone
 *   GET  /auth/me
 *   POST /auth/refresh
 *   POST /auth/logout
 *   POST /auth/logout-all
 */

import asyncWrapper from "../../lib/asyncWrapper.js";
import * as authService from "./auth.service.js";

// ─────────────────────────────────────────────
// POST /auth/phone
// ─────────────────────────────────────────────

export const phoneAuth = asyncWrapper(async (req, res) => {
  const { idToken } = req.body;

  const result = await authService.authenticateWithPhone({
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

// ─────────────────────────────────────────────
// GET /auth/me
// ─────────────────────────────────────────────

export const getMe = asyncWrapper(async (req, res) => {
  const result = await authService.getMe({
    userId: req.user.userId,
    sessionId: req.user.sessionId,
  });

  return res.status(200).json({
    success: true,
    data: result,
  });
});

// ─────────────────────────────────────────────
// POST /auth/refresh
// ─────────────────────────────────────────────

export const refresh = asyncWrapper(async (req, res) => {
  const { refreshToken } = req.body;

  const result = await authService.refreshSession({
    refreshToken,
  });

  return res.status(200).json({
    success: true,
    data: result,
  });
});

// ─────────────────────────────────────────────
// POST /auth/logout
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// POST /auth/logout-all
// ─────────────────────────────────────────────

export const logoutAll = asyncWrapper(async (req, res) => {
  await authService.logoutAll({
    userId: req.user.userId,
  });

  return res.status(200).json({
    success: true,
    message: "Logged out from all devices.",
  });
});
