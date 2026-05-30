// Aligned with the frontend step registry (19 steps, single voice_recording).
// Was 23 steps with voice_recording_1 through _5 — collapsed to one step
// since the frontend handles all 5 prompts inside a single VoiceRecordingStep.

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
  "auth",
  "voice_questions",
  "voice_recording", // single step — frontend records all 5 prompts here
  "photos",
];

export const getStepIndex = (stepId) => {
  const index = ONBOARDING_STEP_ORDER.indexOf(stepId);

  if (index === -1) {
    throw new Error(`Invalid onboarding step: ${stepId}`);
  }

  return index + 1; // 1-based
};

export const TOTAL_STEPS = ONBOARDING_STEP_ORDER.length; // 19
