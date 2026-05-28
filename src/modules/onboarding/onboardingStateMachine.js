import { BadRequestError } from "../../lib/classes/errorClasses.js";

export const computeOnboardingState = ({ existing, incomingStep }) => {
  if (!existing) {
    throw new BadRequestError("Onboarding session not found.");
  }

  const maxAllowedStep = existing.maxReachedStep;

  // 🚫 prevent skipping ahead
  if (incomingStep > maxAllowedStep + 1) {
    throw new BadRequestError("Invalid onboarding progression detected.");
  }

  const isForwardMove = incomingStep > existing.currentStep;

  return {
    currentStep: incomingStep,
    maxReachedStep: isForwardMove
      ? Math.max(existing.maxReachedStep, incomingStep)
      : existing.maxReachedStep,
    lastStepChangedAt: new Date(),
  };
};
