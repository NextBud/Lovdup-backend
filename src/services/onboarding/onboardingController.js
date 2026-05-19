import asyncWrapper from "../../lib/asyncWrapper.js";
import * as onboardingService from "./onboardingService.js";

export const getMyOnboarding = asyncWrapper(async (req, res) => {
  const result = await onboardingService.getMyOnboarding(req.user.userId);

  return res.status(200).json({
    success: true,
    data: result,
  });
});

export const saveProgress = asyncWrapper(async (req, res) => {
  const result = await onboardingService.saveProgress(
    req.user.userId,
    req.body,
  );

  return res.status(200).json({
    success: true,
    message: "Progress saved",
    data: result,
  });
});

export const completeOnboarding = asyncWrapper(async (req, res) => {
  const result = await onboardingService.completeOnboarding(
    req.user.userId,
    req.body,
  );

  return res.status(200).json({
    success: true,
    message: "Onboarding completed",
    data: result,
  });
});

export const resetOnboarding = asyncWrapper(async (req, res) => {
  const result = await onboardingService.resetOnboarding(req.user.userId);

  return res.status(200).json({
    success: true,
    message: "Onboarding reset",
    data: result,
  });
});
