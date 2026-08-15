// ─────────────────────────────────────────────
// ONBOARDING STEP ORDER
// ─────────────────────────────────────────────
//
// Aligned with the frontend step registry.
//
// Voice steps were removed:
// - voice_questions
// - voice_recording
//
// Auth remains part of the backend step registry,
// while the frontend currently has 16 rendered steps.
// ─────────────────────────────────────────────

export const ONBOARDING_STEP_ORDER = [
  "name",
  "birthday",
  "gender",
  "occupation",
  "location",
  "identity",
  "faith",
  "habits",
  "social",
  "money",
  "financial_status",
  "children",
  "communication",
  "tuesday_vibe",
  "about_me",
  "photos",
];

// ─────────────────────────────────────────────
// GET STEP INDEX
// ─────────────────────────────────────────────

export const getStepIndex = (stepId) => {
  const index = ONBOARDING_STEP_ORDER.indexOf(stepId);

  if (index === -1) {
    throw new Error(`Invalid onboarding step: ${stepId}`);
  }

  return index + 1;
};

// ─────────────────────────────────────────────
// TOTAL STEPS
// ─────────────────────────────────────────────

export const TOTAL_STEPS = ONBOARDING_STEP_ORDER.length;
