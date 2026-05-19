/**
 * onboardingValidator.js
 *
 * Joi schemas for all onboarding endpoints.
 * Gender values must match the Prisma enum exactly.
 */

import Joi from "joi";

const genderSchema = Joi.string().valid("WOMAN", "MAN", "NON_BINARY");

// ─────────────────────────────────────────────
// POST /onboarding/progress
// ─────────────────────────────────────────────

export const saveOnboardingProgressSchema = Joi.object({
  currentStep: Joi.number().integer().min(1).max(23).required(),

  completedSections: Joi.array()
    .items(
      Joi.string().valid(
        "auth",
        "basics",
        "lifestyle",
        "preferences",
        "voice",
        "photos",
      ),
    )
    .default([]),

  draftData: Joi.object().unknown(true).required(),
});

// ─────────────────────────────────────────────
// POST /onboarding/complete
// This is the final submission — all fields are required.
// ─────────────────────────────────────────────

export const completeOnboardingSchema = Joi.object({
  // Identity (steps 1–6)
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

  // Faith (step 7)
  religion: Joi.string().trim().min(1).required(),
  religionImportance: Joi.string()
    .valid("Not very", "Somewhat", "Very")
    .required(),

  // Lifestyle (steps 8–11)
  drinking: Joi.string().valid("Never", "Socially", "Regularly").required(),
  smoking: Joi.string().valid("Never", "Occasionally", "Yes").required(),
  socialLife: Joi.string()
    .valid("Very social", "Homebody", "Balanced")
    .required(),
  fitnessImportance: Joi.string()
    .valid("Not very", "Somewhat", "Very")
    .required(),
  moneyStyle: Joi.string().valid("Saver", "Spender", "Balance").required(),
  relocationFeelings: Joi.string().valid("Yes", "Maybe", "No").required(),
  financialStatus: Joi.string().trim().min(1).required(),

  // Values (steps 12–14)
  childrenPreference: Joi.string().trim().min(1).required(),
  personalCommStyle: Joi.string().trim().min(1).required(),
  personalTuesdayVibe: Joi.string().trim().min(1).required(),

  // Narrative (step 15)
  aboutMe: Joi.string().trim().min(10).max(1000).required(),
});
