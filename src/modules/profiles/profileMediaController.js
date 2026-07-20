import asyncWrapper from "../../lib/asyncWrapper.js";
import * as profileMediaService from "./profileMediaService.js";

// ---------------------------------------------------------------------------
// Photo Controllers
// ---------------------------------------------------------------------------

/**
 * GET /profile/:userId/photos
 * Get all photos for a specific user
 */
export const getUserPhotos = asyncWrapper(async (req, res) => {
  const viewerId = req.user.userId;
  const { userId } = req.params;
  const { status, onlyPrimary } = req.query;

  const result = await profileMediaService.getUserPhotos({
    viewerId,
    userId,
    status,
    onlyPrimary: onlyPrimary === "true",
  });

  res.status(200).json({
    success: true,
    message: "Photos retrieved successfully",
    data: result,
  });
});

/**
 * GET /profile/me/photos
 * Get authenticated user's photos (shortcut)
 */
export const getMyPhotos = asyncWrapper(async (req, res) => {
  const userId = req.user.userId;
  const { status, onlyPrimary } = req.query;

  const result = await profileMediaService.getUserPhotos({
    viewerId: userId,
    userId,
    status,
    onlyPrimary: onlyPrimary === "true",
  });

  res.status(200).json({
    success: true,
    message: "Photos retrieved successfully",
    data: result,
  });
});

/**
 * GET /profile/photos/:photoId
 * Get a specific photo by ID
 */
export const getPhotoById = asyncWrapper(async (req, res) => {
  const viewerId = req.user.userId;
  const { photoId } = req.params;

  const photo = await profileMediaService.getPhotoById({
    viewerId,
    photoId,
  });

  res.status(200).json({
    success: true,
    message: "Photo retrieved successfully",
    data: photo,
  });
});

/**
 * GET /profile/:userId/primary-photo
 * Get primary photo for a user
 */
export const getPrimaryPhoto = asyncWrapper(async (req, res) => {
  const viewerId = req.user.userId;
  const { userId } = req.params;

  const photo = await profileMediaService.getPrimaryPhoto({
    viewerId,
    userId,
  });

  res.status(200).json({
    success: true,
    message: "Primary photo retrieved successfully",
    data: photo,
  });
});

// ---------------------------------------------------------------------------
// Voice Answer Controllers
// ---------------------------------------------------------------------------

/**
 * GET /profile/:userId/voice
 * Get all voice answers for a specific user
 */
export const getUserVoiceAnswers = asyncWrapper(async (req, res) => {
  const viewerId = req.user.userId;
  const { userId } = req.params;
  const { status, category, minDuration, maxDuration } = req.query;

  const result = await profileMediaService.getUserVoiceAnswers({
    viewerId,
    userId,
    status,
    category,
    minDuration: minDuration ? parseInt(minDuration) : null,
    maxDuration: maxDuration ? parseInt(maxDuration) : null,
  });

  res.status(200).json({
    success: true,
    message: "Voice answers retrieved successfully",
    data: result,
  });
});

/**
 * GET /profile/me/voice
 * Get authenticated user's voice answers (shortcut)
 */
export const getMyVoiceAnswers = asyncWrapper(async (req, res) => {
  const userId = req.user.userId;
  const { status, category, minDuration, maxDuration } = req.query;

  const result = await profileMediaService.getUserVoiceAnswers({
    viewerId: userId,
    userId,
    status,
    category,
    minDuration: minDuration ? parseInt(minDuration) : null,
    maxDuration: maxDuration ? parseInt(maxDuration) : null,
  });

  res.status(200).json({
    success: true,
    message: "Voice answers retrieved successfully",
    data: result,
  });
});

/**
 * GET /profile/voice/:voiceAnswerId
 * Get a specific voice answer by ID
 */
export const getVoiceAnswerById = asyncWrapper(async (req, res) => {
  const viewerId = req.user.userId;
  const { voiceAnswerId } = req.params;

  const voiceAnswer = await profileMediaService.getVoiceAnswerById({
    viewerId,
    voiceAnswerId,
  });

  res.status(200).json({
    success: true,
    message: "Voice answer retrieved successfully",
    data: voiceAnswer,
  });
});

// ---------------------------------------------------------------------------
// Combined Media Controllers
// ---------------------------------------------------------------------------

/**
 * GET /profile/:userId/media
 * Get all media (photos + voice) for a user
 */
export const getUserMedia = asyncWrapper(async (req, res) => {
  const viewerId = req.user.userId;
  const { userId } = req.params;
  const {
    photoStatus,
    voiceStatus,
    onlyPrimary,
    category,
    minDuration,
    maxDuration,
  } = req.query;

  const result = await profileMediaService.getUserMedia({
    viewerId,
    userId,
    photoStatus,
    voiceStatus,
    onlyPrimary: onlyPrimary === "true",
    category,
    minDuration: minDuration ? parseInt(minDuration) : null,
    maxDuration: maxDuration ? parseInt(maxDuration) : null,
  });

  res.status(200).json({
    success: true,
    message: "Media retrieved successfully",
    data: result,
  });
});

/**
 * GET /profile/me/media
 * Get authenticated user's media (shortcut)
 */
export const getMyMedia = asyncWrapper(async (req, res) => {
  const userId = req.user.userId;
  const {
    photoStatus,
    voiceStatus,
    onlyPrimary,
    category,
    minDuration,
    maxDuration,
  } = req.query;

  const result = await profileMediaService.getUserMedia({
    viewerId: userId,
    userId,
    photoStatus,
    voiceStatus,
    onlyPrimary: onlyPrimary === "true",
    category,
    minDuration: minDuration ? parseInt(minDuration) : null,
    maxDuration: maxDuration ? parseInt(maxDuration) : null,
  });

  res.status(200).json({
    success: true,
    message: "Media retrieved successfully",
    data: result,
  });
});
