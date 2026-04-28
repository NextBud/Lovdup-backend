import express from "express";
import { authMiddleware } from "../auth/authMiddleware.js";
import { validateBody } from "../middlewares/validate.js";
import {
  completeOnboarding,
  getMyOnboarding,
  saveProgress,
} from "./onboardingController.js";
import {
  completeOnboardingSchema,
  saveOnboardingProgressSchema,
} from "./onboardingValidator.js";

const router = express.Router();

router.get("/me", authMiddleware, getMyOnboarding);

router.put(
  "/progress",
  authMiddleware,
  validateBody(saveOnboardingProgressSchema),
  saveProgress,
);

router.post(
  "/complete",
  authMiddleware,
  validateBody(completeOnboardingSchema),
  completeOnboarding,
);

export default router;
