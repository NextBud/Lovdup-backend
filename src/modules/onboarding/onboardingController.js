import asyncWrapper from "../../lib/asyncWrapper.js";
import * as onboardingService from "./onboardingService.js";

// GET /onboarding/me
export const getMyOnboarding = asyncWrapper(async (req, res) => {
  const result = await onboardingService.getMyOnboarding(req.user.userId);

  return res.status(200).json({ success: true, data: result });
});

// PUT /onboarding/draft
// Body: { stepId, data } — stepId comes from body, not URL params
export const saveDraft = asyncWrapper(async (req, res) => {
  const { stepId, data } = req.body; // was req.params.stepId — fixed

  const result = await onboardingService.saveProgress({
    userId: req.user.userId,
    stepId,
    data,
  });

  return res.status(200).json({
    success: true,
    message: "Progress saved",
    data: result,
  });
});

// POST /onboarding/complete
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

// POST /onboarding/reset
export const resetOnboarding = asyncWrapper(async (req, res) => {
  const result = await onboardingService.resetOnboarding(req.user.userId);

  return res.status(200).json({
    success: true,
    message: "Onboarding reset",
    data: result,
  });
});

// GET /onboarding/voice-prompts
// Public reference data — frontend calls this before recording so it has
// real VoicePrompt ids to send back on POST /onboarding/media/voices.
export const getVoicePrompts = asyncWrapper(async (req, res) => {
  const prompts = await onboardingService.getVoicePrompts();

  return res.status(200).json({
    success: true,
    data: prompts,
  });
});

