import Joi from "joi";
import { normalizeGenderOrThrow } from "../../lib/genderNormalizer.js";

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

// ---------------------------------------------------------------------------
// Identity  (PUT /profile/identity)
// Onboarding steps 1–6
// ---------------------------------------------------------------------------

export const upsertProfileIdentitySchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName:  Joi.string().trim().min(1).max(50).required(),

  birthDate: Joi.date().iso().max("now").required().messages({
    "date.max": "Birth date cannot be in the future",
  }),

  // "Woman" | "Man" | "Non-binary" → "WOMAN" | "MAN" | "NON_BINARY"
  gender: genderSchema.required(),

  originCountry:    Joi.string().trim().min(1).max(100).required(),
  residenceCountry: Joi.string().trim().min(1).max(100).required(),
  residenceCity:    Joi.string().trim().min(1).max(100).required(),

  ethnicity: Joi.string().trim().max(100).allow(null, "").optional(),

  // Accepts comma-separated string or array
  languages: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim()).min(1),
      Joi.string().trim().custom((value) =>
        value.split(",").map((s) => s.trim()).filter(Boolean),
      ),
    )
    .required(),

  occupation: Joi.string().trim().min(1).max(100).required(),

  relationshipIntention: Joi.string().trim().max(100).allow(null, "").optional(),
  education:             Joi.string().trim().max(100).allow(null, "").optional(),
});

// ---------------------------------------------------------------------------
// Lifestyle  (PUT /profile/lifestyle)
// Onboarding steps 8–11
// ---------------------------------------------------------------------------

export const upsertProfileLifestyleSchema = Joi.object({
  drinking:          Joi.string().valid("Never", "Socially", "Regularly").required(),
  smoking:           Joi.string().valid("Never", "Occasionally", "Yes").required(),
  socialLife:        Joi.string().valid("Very social", "Homebody", "Balanced").required(),
  fitnessImportance: Joi.string().valid("Not very", "Somewhat", "Very").required(),
  moneyStyle:        Joi.string().valid("Saver", "Spender", "Balance").required(),
  relocationFeelings: Joi.string().valid("Yes", "Maybe", "No").required(),
  financialStatus:   Joi.string().trim().required(),
});

// ---------------------------------------------------------------------------
// Values  (PUT /profile/values)
// Onboarding steps 7, 12–14
// ---------------------------------------------------------------------------

export const upsertProfileValuesSchema = Joi.object({
  religion:           Joi.string().trim().min(1).required(),
  religionImportance: Joi.string().valid("Not very", "Somewhat", "Very").required(),
  childrenPreference: Joi.string().trim().required(),
  hasChildren:        Joi.boolean().default(false),
  personalCommStyle:  Joi.string().trim().required(),
  personalTuesdayVibe: Joi.string().trim().required(),
});

// ---------------------------------------------------------------------------
// Narrative  (PUT /profile/narrative)
// Onboarding step 15
// ---------------------------------------------------------------------------

export const upsertProfileNarrativeSchema = Joi.object({
  aboutMe: Joi.string().trim().min(10).max(2000).required(),
});

// ---------------------------------------------------------------------------
// Photos  (PUT /profile/photos)
// Onboarding step 23 — files already uploaded to Cloudinary by middleware
// ---------------------------------------------------------------------------

const photoSchema = Joi.object({
  url:      Joi.string().uri().required(),
  publicId: Joi.string().trim().required(),
  mimeType: Joi.string().trim().required(),
  size:     Joi.number().integer().positive().required(),
});

export const saveProfilePhotosSchema = Joi.object({
  photos: Joi.array().items(photoSchema).min(2).max(4).required().messages({
    "array.min": "Upload at least 2 photos",
    "array.max": "Maximum 4 photos allowed",
  }),
});

// ---------------------------------------------------------------------------
// Voice answers  (PUT /profile/voice)
// Onboarding steps 18–22 — audio already uploaded to storage by middleware
// ---------------------------------------------------------------------------

const voiceAnswerSchema = Joi.object({
  voicePromptId:   Joi.string().uuid().required(),
  url:             Joi.string().uri().required(),
  publicId:        Joi.string().trim().required(),
  mimeType:        Joi.string().trim().required(),
  size:            Joi.number().integer().positive().required(),
  durationSeconds: Joi.number().integer().positive().allow(null).optional(),
});

export const saveVoiceAnswersSchema = Joi.object({
  answers: Joi.array().items(voiceAnswerSchema).min(1).max(5).required(),
});