import Joi from "joi";

export const upsertMatchPreferenceSchema = Joi.object({
  ageRange: Joi.string().trim().required(),

  preferredGenders: Joi.array()
    .items(Joi.string().valid("WOMAN", "MAN", "NON_BINARY"))
    .min(1)
    .required(),

  locationPreference: Joi.string().trim().required(),
  religionPreference: Joi.string().trim().required(),
  culturePreference: Joi.string().trim().required(),
  childrenPreference: Joi.string().trim().required(),

  energyDescription: Joi.string().trim().required(),
  communicationStyle: Joi.string().trim().required(),
  tuesdayFeeling: Joi.string().trim().required(),
  energyMatchStyle: Joi.string().trim().required(),

  ambitionImportance: Joi.string().trim().required(),
  faithPractice: Joi.string().trim().required(),
  socialLevel: Joi.string().trim().required(),
  lifestylePreference: Joi.string().trim().required(),

  financialStabilityPreference: Joi.string().trim().required(),
  financialStagePreference: Joi.string().trim().required(),

  idealPartnerType: Joi.string().trim().required(),

  matchVoicePrompt: Joi.string().trim().min(6).max(500).required(),

  minCompatibilityScore: Joi.number().integer().min(0).max(100).default(50),
});
