import express from "express";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { validateBody } from "../../../middlewares/validator/validator.js";
import { upsertMatchPreferenceSchema } from "./matchPreference.validation.js";
import {
  getMyMatchPreference,
  upsertMyMatchPreference,
  deleteMyMatchPreference,
} from "./matchPreference.controller.js";

const matchPreferenceRouter = express.Router();

// All match preference routes require authentication
matchPreferenceRouter.use(authMiddleware);

/**
 * GET /match-preferences
 * Fetch the current user's match preferences.
 * Returns 404 if none exist (which the frontend treats as "show wizard with defaults").
 */
matchPreferenceRouter.get("/", getMyMatchPreference);

/**
 * PUT /match-preferences
 * Create or update the current user's match preferences.
 * Uses upsertMatchPreferenceSchema to validate the payload.
 */
matchPreferenceRouter.put(
  "/",
  validateBody(upsertMatchPreferenceSchema),
  upsertMyMatchPreference,
);

/**
 * DELETE /match-preferences
 * Reset/delete the current user's match preferences.
 */
matchPreferenceRouter.delete("/", deleteMyMatchPreference);

export default matchPreferenceRouter;
