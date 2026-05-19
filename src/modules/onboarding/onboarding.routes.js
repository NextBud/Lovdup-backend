import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";
import {
  getMyOnboarding,
  saveProgress,
  completeOnboarding,
  resetOnboarding,
} from "./onboardingController.js";
import {
  uploadOnboardingPhotos,
  uploadOnboardingVoices,
} from "./onboardingMediaController.js";
import {
  handleOnboardingPhotoUpload,
  handleOnboardingVoiceUpload,
} from "../media/mediaUploadMiddleware.js";

const router = Router();

// All onboarding routes require an authenticated user
router.use(protect);

// Progress
router.get("/", getMyOnboarding);
router.post("/progress", saveProgress);
router.post("/complete", completeOnboarding);
router.post("/reset", resetOnboarding);

// Media — multer middleware runs before the controller
router.post(
  "/media/photos",
  handleOnboardingPhotoUpload,
  uploadOnboardingPhotos,
);
router.post(
  "/media/voices",
  handleOnboardingVoiceUpload,
  uploadOnboardingVoices,
);

export default router;
