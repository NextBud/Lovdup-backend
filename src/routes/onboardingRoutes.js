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

// ─── Global Auth Guard ─────────────────────────────────────────────
router.use(authMiddleware);

// ─── Onboarding Core ───────────────────────────────────────────────

// GET current onboarding state
router.get("/me", onboardingController.getMyOnboarding);

// Save incremental progress (PUT = idempotent update ✔)
router.put(
  "/progress",
  validateBody(saveOnboardingProgressSchema),
  onboardingController.saveProgress,
);

// Final submission
router.post(
  "/complete",
  validateBody(completeOnboardingSchema),
  onboardingController.completeOnboarding,
);

// ─── Media Uploads ─────────────────────────────────────────────────

// Upload photos
router.post(
  "/media/photos",
  handleOnboardingPhotoUpload,
  onboardingMediaController.uploadOnboardingPhotos,
);

// Upload voice recordings
router.post(
  "/media/voices",
  handleOnboardingVoiceUpload,
  onboardingMediaController.uploadOnboardingVoices,
);

export default router;
