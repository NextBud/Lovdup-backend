export const ONBOARDING_STEP_REGISTRY = {
  name: {
    requiredFields: ["firstName", "lastName"],
  },
  birthday: {
    requiredFields: ["birthDate"],
  },
  gender: {
    requiredFields: ["gender"],
  },
  occupation: {
    requiredFields: ["occupation"],
  },
  location: {
    requiredFields: ["originCountry", "residenceCountry", "residenceCity"],
  },

  identity: {
    requiredFields: ["languages"],
  },

  faith: {
    requiredFields: ["religion", "religionImportance"],
  },

  habits: {
    requiredFields: ["drinking", "smoking"],
  },

  social: {
    requiredFields: ["socialLife", "fitnessImportance"],
  },

  money: {
    requiredFields: ["moneyStyle", "relocationFeelings"],
  },

  financial_status: {
    requiredFields: ["financialStatus"],
  },

  children: {
    requiredFields: ["childrenPreference"],
  },

  communication: {
    requiredFields: ["communicationStyle"],
  },

  tuesday_vibe: {
    requiredFields: ["tuesdayVibe"],
  },

  about_me: {
    requiredFields: ["aboutMe"],
  },

  auth: {
    requiredFields: [],
  },

  voice_questions: {
    requiredFields: ["selectedVoiceQuestions"],
  },

  voice_recording: {
    requiredFields: ["voiceAnswers"],
  },

  photos: {
    requiredFields: ["photos"],
  },
};
