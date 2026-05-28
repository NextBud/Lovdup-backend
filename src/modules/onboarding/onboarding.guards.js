import { ONBOARDING_STEP_REGISTRY } from "../../shared/onboarding/onboarding.contract.js";

export const validateStepCompletion = (stepId, profile) => {
  const step = ONBOARDING_STEP_REGISTRY[stepId];

  if (!step) return false;

  return step.requiredFields.every((field) => {
    const value = profile?.[field];

    if (Array.isArray(value)) return value.length > 0;

    if (typeof value === "string") return value.trim().length > 0;

    return value !== null && value !== undefined;
  });
};
