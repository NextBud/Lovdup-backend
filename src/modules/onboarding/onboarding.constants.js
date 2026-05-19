export const ONBOARDING_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
};

export const ONBOARDING_SECTIONS = {
  AUTH: "auth",
  BASICS: "basics",
  LIFESTYLE: "lifestyle",
  PREFERENCES: "preferences",
  VOICE: "voice",
  PHOTOS: "photos",
};

export const FINAL_ONBOARDING_STEP = 23;

export const CURRENT_DRAFT_VERSION = 1;

// Max media counts enforced at both middleware and service layer
export const MAX_ONBOARDING_PHOTOS = 4;
export const MIN_ONBOARDING_PHOTOS = 2;
export const MAX_ONBOARDING_VOICES = 5;
export const REQUIRED_ONBOARDING_VOICES = 5;
