/**
 * auth.routes.js
 *
 * Public routes (no auth required):
 *   POST /auth/password    — email/password login or register
 *   POST /auth/firebase    — social/phone login via Firebase idToken
 *   POST /auth/refresh     — rotate refresh token
 *
 * Protected routes (valid JWT required):
 *   GET  /auth/me          — rehydrate session on app load (was missing)
 *   POST /auth/logout      — revoke current session
 *   POST /auth/logout-all  — revoke all sessions for this user
 */

import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  passwordAuth,
  firebaseAuth,
  refresh,
  getMe, // ← added: was missing, caused 404 on session rehydration
  logout,
  logoutAll,
} from "./auth.controller.js";
import { validateBody } from "../../middlewares/validator/validator.js";
import {
  passwordAuthSchema,
  firebaseAuthSchema,
  refreshSchema,
} from "./auth.validators.js";

const authRouter = Router();

// ── PUBLIC ────────────────────────────────────
authRouter.post("/password", validateBody(passwordAuthSchema), passwordAuth);
authRouter.post("/firebase", validateBody(firebaseAuthSchema), firebaseAuth);
authRouter.post("/refresh", validateBody(refreshSchema), refresh);

// ── PROTECTED ─────────────────────────────────
authRouter.get("/me", authMiddleware, getMe);
authRouter.post("/logout", authMiddleware, logout);
authRouter.post("/logout-all", authMiddleware, logoutAll);

export default authRouter;
