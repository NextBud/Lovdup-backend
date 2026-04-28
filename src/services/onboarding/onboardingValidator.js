import Joi from "joi";

const genderSchema = Joi.string().valid("WOMAN", "MAN", "NON_BINARY");

export const saveOnboardingProgressSchema = Joi.object({
  currentStep: Joi.number().integer().min(1).max(23).required(),

  completedSections: Joi.array().items(Joi.string()).default([]),

  draftData: Joi.object().unknown(true).required(),
});

export const completeOnboardingSchema = Joi.object({
  firstName: Joi.string().trim().min(1).required(),
  lastName: Joi.string().trim().min(1).required(),
  birthDate: Joi.date().required(),
  gender: genderSchema.required(),

  originCountry: Joi.string().trim().required(),
  residenceCountry: Joi.string().trim().required(),
  residenceCity: Joi.string().trim().required(),

  ethnicity: Joi.string().trim().allow(null, "").optional(),
  languages: Joi.array().items(Joi.string().trim()).min(1).required(),
  occupation: Joi.string().trim().required(),

  religion: Joi.string().trim().required(),
  religionImportance: Joi.string().trim().required(),

  drinking: Joi.string().trim().required(),
  smoking: Joi.string().trim().required(),
  socialLife: Joi.string().trim().required(),
  fitnessImportance: Joi.string().trim().required(),

  moneyStyle: Joi.string().trim().required(),
  relocationFeelings: Joi.string().trim().required(),
  financialStatus: Joi.string().trim().required(),
  childrenPreference: Joi.string().trim().required(),
  personalCommStyle: Joi.string().trim().required(),
  personalTuesdayVibe: Joi.string().trim().required(),

  aboutMe: Joi.string().trim().min(10).required(),
});
