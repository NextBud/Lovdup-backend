/**
 * auth.routes.js
 *
 * Public routes (no auth required):
 *   POST /auth/password    — email/password login or register
 *   POST /auth/firebase    — social/phone login via Firebase
 *   POST /auth/refresh     — rotate refresh token
 *
 * Protected routes (valid JWT required):
 *   POST /auth/logout      — revoke current session
 *   POST /auth/logout-all  — revoke all sessions
 */

import { Router } from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import {
  passwordAuth,
  firebaseAuth,
  refresh,
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

// Public
authRouter.post("/password", validateBody(passwordAuthSchema), passwordAuth);
authRouter.post("/firebase", validateBody(firebaseAuthSchema), firebaseAuth);
authRouter.post("/refresh", validateBody(refreshSchema), refresh);

// Protected
authRouter.post("/logout", protect, logout);
authRouter.post("/logout-all", protect, logoutAll);

export default authRouter;
