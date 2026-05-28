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
  "voice_recording_1",
  "voice_recording_2",
  "voice_recording_3",
  "voice_recording_4",
  "voice_recording_5",
  "photos",
];

export const getStepIndex = (stepId) => {
  const index = ONBOARDING_STEP_ORDER.indexOf(stepId);

  if (index === -1) {
    throw new Error(`Invalid onboarding step: ${stepId}`);
  }

  return index + 1;
};
