import asyncWrapper from "../../lib/asyncWrapper.js";
import * as profileService from "./profileService.js";

/**
 * GET /profile/me
 * Returns the authenticated user's full profile with all sub-relations.
 */
export const getMyProfile = asyncWrapper(async (req, res) => {
  const profile = await profileService.getMyProfile(req.user.id);

  res.status(200).json({
    success: true,
    message: "Profile fetched successfully",
    data: profile,
  });
});

/**
 * PUT /profile/identity
 * Onboarding steps 1–6: name, birthday, gender, occupation, location, identity.
 * Validated by upsertProfileIdentitySchema — gender is normalized before
 * reaching this controller.
 */
export const upsertIdentity = asyncWrapper(async (req, res) => {
  const result = await profileService.upsertIdentity(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: "Identity saved successfully",
    data: result,
  });
});

/**
 * PUT /profile/lifestyle
 * Onboarding steps 8–11: habits, social, money, financial status.
 */
export const upsertLifestyle = asyncWrapper(async (req, res) => {
  const result = await profileService.upsertLifestyle(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: "Lifestyle saved successfully",
    data: result,
  });
});

/**
 * PUT /profile/values
 * Onboarding steps 7, 12–14: faith, children, comm style, tuesday vibe.
 */
export const upsertValues = asyncWrapper(async (req, res) => {
  const result = await profileService.upsertValues(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: "Values saved successfully",
    data: result,
  });
});

/**
 * PUT /profile/narrative
 * Onboarding step 15: about me.
 */
export const upsertNarrative = asyncWrapper(async (req, res) => {
  const result = await profileService.upsertNarrative(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: "Narrative saved successfully",
    data: result,
  });
});

/**
 * PUT /profile/photos
 * Onboarding step 23: profile photos.
 * Expects req.body.photos = [{ url, publicId, mimeType, size }]
 * after your media upload middleware has already pushed files to Cloudinary.
 */
export const savePhotos = asyncWrapper(async (req, res) => {
  const result = await profileService.saveProfilePhotos(
    req.user.id,
    req.body.photos,
  );

  res.status(200).json({
    success: true,
    message: "Photos saved successfully",
    data: result,
  });
});

/**
 * PUT /profile/voice
 * Onboarding steps 18–22: voice answers.
 * Expects req.body.answers = [{ voicePromptId, url, publicId, mimeType, size, durationSeconds }]
 * after your media upload middleware has already pushed files to storage.
 */
export const saveVoiceAnswers = asyncWrapper(async (req, res) => {
  const result = await profileService.saveVoiceAnswers(
    req.user.id,
    req.body.answers,
  );

  res.status(200).json({
    success: true,
    message: "Voice answers saved successfully",
    data: result,
  });
});
