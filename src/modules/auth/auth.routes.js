/**
 * auth.routes.js
 *
 * Public:
 *   POST /auth/phone
 *   POST /auth/refresh
 *
 * Protected:
 *   GET  /auth/me
 *   POST /auth/logout
 *   POST /auth/logout-all
 */

import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../middlewares/validator/validator.js";
import {
  phoneAuthSchema,
  refreshSchema,
  emailAuthSchema,
} from "./auth.validators.js";

import {
  phoneAuth,
  emailAuth,
  refresh,
  getMe,
  logout,
  logoutAll,
} from "./auth.controller.js";

const authRouter = Router();

// ─────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────

authRouter.post("/phone", validateBody(phoneAuthSchema), phoneAuth);
authRouter.post("/email", validateBody(emailAuthSchema), emailAuth);
authRouter.post("/refresh", validateBody(refreshSchema), refresh);

// ─────────────────────────────────────────────
// PROTECTED
// ─────────────────────────────────────────────

authRouter.get("/me", authMiddleware, getMe);

authRouter.post("/logout", authMiddleware, logout);

authRouter.post("/logout-all", authMiddleware, logoutAll);

export default authRouter;
