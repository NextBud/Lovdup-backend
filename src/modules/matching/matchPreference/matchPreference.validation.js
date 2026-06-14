import Joi from "joi";
import { normalizeGenderOrThrow } from "../../../lib/genderNormalizer.js";

export const genderSchema = Joi.string()
  .trim()
  .custom((value, helpers) => {
    try {
      return normalizeGenderOrThrow(value); // transforms "Woman" → "WOMAN"
    } catch {
      return helpers.error("any.invalid");
    }
  })
  .messages({
    "any.invalid": `Gender must be one of: Woman, Man, Non-binary`,
  });

export const upsertMatchPreferenceSchema = Joi.object({
  // CHANGED: ageRange String → ageMin + ageMax integers
  ageMin: Joi.number().integer().min(18).max(99).required(),
  ageMax: Joi.number().integer().min(18).max(99).required(),

  // CHANGED: uses genderSchema so "Woman" → "WOMAN" automatically
  preferredGenders: Joi.array().items(genderSchema).min(1).required(),

  locationPreference: Joi.string().valid("Same city", "Same country", "Anywhere").required(),
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
}).custom((value, helpers) => {
  if (value.ageMin > value.ageMax) {
    return helpers.error("any.custom", {
      message: "ageMin must be less than or equal to ageMax",
    });
  }
  return value;
});