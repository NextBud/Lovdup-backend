import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  getMyOnboarding,
  saveDraft,
  completeOnboarding,
  resetOnboarding,
} from "./onboardingController.js";
import { uploadOnboardingPhotos } from "./onboardingMediaController.js";
import { handleOnboardingPhotoUpload } from "../../middlewares/mediaUploadMiddleware.js";

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

export default onboardingRouter;
