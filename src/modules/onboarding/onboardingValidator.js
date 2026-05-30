/**
 * onboardingValidator.js
 *
 * All values must match onboarding.options.ts on the frontend exactly.
 * Gender values must match the Prisma enum exactly (WOMAN, MAN, NON_BINARY).
 */

import Joi from "joi";

const genderSchema = Joi.string().valid("WOMAN", "MAN", "NON_BINARY");

// ─────────────────────────────────────────────
// PUT /onboarding/draft
// Body: { stepId, data }
// ─────────────────────────────────────────────

export const saveOnboardingProgressSchema = Joi.object({
  stepId: Joi.string().trim().min(1).required(),

  data: Joi.object().unknown(true).required(),
});

// ─────────────────────────────────────────────
// POST /onboarding/complete
// All field values aligned with onboarding.options.ts canonical lists.
// ─────────────────────────────────────────────

export const completeOnboardingSchema = Joi.object({
  // Identity
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  birthDate: Joi.date().iso().max("now").required(),
  gender: genderSchema.required(),

  originCountry: Joi.string().trim().min(1).required(),
  residenceCountry: Joi.string().trim().min(1).required(),
  residenceCity: Joi.string().trim().min(1).required(),
  ethnicity: Joi.string().trim().allow(null, "").optional(),
  languages: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  occupation: Joi.string().trim().min(1).required(),

  // Faith — aligned to onboarding.options.ts RELIGION_IMPORTANCE
  religion: Joi.string().trim().min(1).required(),
  religionImportance: Joi.string()
    .valid("Very important", "Somewhat important", "Not important")
    .required(),

  // Lifestyle — aligned to onboarding.options.ts
  drinking: Joi.string()
    .valid("Never", "Socially", "Frequently") // was "Regularly"
    .required(),
  smoking: Joi.string()
    .valid("Never", "Occasionally", "Frequently") // was "Yes"
    .required(),
  socialLife: Joi.string()
    .valid("Homebody", "Balanced", "Very social")
    .required(),
  fitnessImportance: Joi.string()
    .valid("Very important", "Moderately important", "Not important") // was "Not very/Somewhat/Very"
    .required(),
  moneyStyle: Joi.string()
    .valid("Saver", "Balanced", "Big spender") // was "Spender"/"Balance"
    .required(),
  relocationFeelings: Joi.string()
    .valid(
      "Open to relocating",
      "Prefer not to relocate",
      "Depends on the person",
    ) // was "Yes/Maybe/No"
    .required(),
  financialStatus: Joi.string()
    .valid("Student", "Building stability", "Stable", "Very comfortable")
    .required(),

  // Values — aligned to onboarding.options.ts
  childrenPreference: Joi.string()
    .valid("Want children", "Open to children", "Do not want children")
    .required(),
  communicationStyle: Joi.string() // was personalCommStyle
    .valid("Direct", "Gentle", "Expressive", "Reserved")
    .required(),
  tuesdayVibe: Joi.string() // was personalTuesdayVibe
    .valid(
      "Netflix at home",
      "Gym & productivity",
      "Dinner outside",
      "Gaming all night",
      "Working late",
    )
    .required(),

  // Narrative
  aboutMe: Joi.string().trim().min(10).max(1000).required(),
});
