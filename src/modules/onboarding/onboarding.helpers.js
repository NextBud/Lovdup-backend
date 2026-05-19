export const mergeCompletedSections = (
  existingSections = [],
  newSections = [],
) => {
  return [...new Set([...existingSections, ...newSections])];
};

export const appendDraftArray = (draftData = {}, field, values = []) => {
  const existing = draftData[field] || [];

  return {
    ...draftData,
    [field]: [...existing, ...values],
  };
};

export const sanitizeDraftData = (draftData = {}) => {
  const sanitized = { ...draftData };

  delete sanitized.password;
  delete sanitized.confirmPassword;
  delete sanitized.passwordHash;

  return sanitized;
};

/**
 * Splits a flat completeOnboarding payload into the shaped sub-objects
 * each Prisma sub-model expects. Keeps the service layer clean.
 */
export const extractProfilePayloads = (payload) => {
  const identity = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    birthDate: new Date(payload.birthDate),
    gender: payload.gender,
    originCountry: payload.originCountry,
    residenceCountry: payload.residenceCountry,
    residenceCity: payload.residenceCity,
    ethnicity: payload.ethnicity ?? null,
    languages: payload.languages,
    occupation: payload.occupation,
  };

  const lifestyle = {
    drinking: payload.drinking,
    smoking: payload.smoking,
    socialLife: payload.socialLife,
    fitnessImportance: payload.fitnessImportance,
    moneyStyle: payload.moneyStyle,
    relocationFeelings: payload.relocationFeelings,
    financialStatus: payload.financialStatus,
  };

  const values = {
    religion: payload.religion,
    religionImportance: payload.religionImportance,
    childrenPreference: payload.childrenPreference,
    personalCommStyle: payload.personalCommStyle,
    personalTuesdayVibe: payload.personalTuesdayVibe,
  };

  const narrative = {
    aboutMe: payload.aboutMe,
  };

  return { identity, lifestyle, values, narrative };
};