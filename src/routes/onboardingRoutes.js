import express from "express";

import { authMiddleware } from "../authMiddlware/authMiddleware.js";

import { validateBody } from "../middlewares/validator/validator.js";

import * as onboardingController from "../services/onboarding/onboardingController.js";

import * as onboardingMediaController from "../services/onboarding/onboardingMediaController.js";

import {
  handleOnboardingPhotoUpload,
  handleOnboardingVoiceUpload,
} from "../middleware/mediaUploadMiddleware.js";

import {
  completeOnboardingSchema,
  saveOnboardingProgressSchema,
} from "../services/onboarding/onboardingValidator.js";

const router = express.Router();

// ─────────────────────────────────────────────
// AUTH GUARD
// ─────────────────────────────────────────────

router.use(authMiddleware);

// ─────────────────────────────────────────────
// ONBOARDING CORE
// ─────────────────────────────────────────────

// Current onboarding state
router.get("/me", onboardingController.getMyOnboarding);

// Save draft
router.put(
  "/draft",
  validateBody(saveOnboardingProgressSchema),
  onboardingController.saveDraft,
);

// Complete onboarding
router.post(
  "/complete",
  validateBody(completeOnboardingSchema),
  onboardingController.completeOnboarding,
);

// Reset onboarding
router.post("/reset", onboardingController.resetOnboarding);

// ─────────────────────────────────────────────
// MEDIA
// ─────────────────────────────────────────────

// Photos
router.post(
  "/media/photos",
  handleOnboardingPhotoUpload,
  onboardingMediaController.uploadOnboardingPhotos,
);

// Voices
router.post(
  "/media/voices",
  handleOnboardingVoiceUpload,
  onboardingMediaController.uploadOnboardingVoices,
);

export default router;
