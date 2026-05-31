import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  getMyOnboarding,
  saveDraft,
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
} from "../../middlewares/mediaUploadMiddleware.js";

const onboardingRouter = Router();

onboardingRouter.use(authMiddleware); // All routes require authentication

// Progress
onboardingRouter.get("/", getMyOnboarding);
onboardingRouter.post("/draft", saveDraft);
onboardingRouter.post("/complete", completeOnboarding);
onboardingRouter.post("/reset", resetOnboarding);

// Media — multer middleware runs before the controller
onboardingRouter.post(
  "/media/photos",
  handleOnboardingPhotoUpload,
  uploadOnboardingPhotos,
);
onboardingRouter.post(
  "/media/voices",
  handleOnboardingVoiceUpload,
  uploadOnboardingVoices,
);

export default onboardingRouter;
