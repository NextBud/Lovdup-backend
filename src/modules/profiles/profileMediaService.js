import {
  NotFoundException,
  ForbiddenError,
  BadRequestError,
} from "../../classes/errorClasses.js";
import * as profileDb from "./profileDbService.js";
import * as photoDb from "./profilePhotoDbService.js";
import * as voiceDb from "./voiceAnswerDbService.js";
import * as matchDb from "../matching/match/match.db.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PHOTO_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

const VOICE_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const formatPhoto = (photo) => ({
  id: photo.id,
  url: photo.url,
  publicId: photo.publicId,
  isPrimary: photo.isPrimary,
  position: photo.position,
  status: photo.status,
  mimeType: photo.mimeType,
  size: photo.size,
  createdAt: photo.createdAt,
  updatedAt: photo.updatedAt,
});

const formatVoiceAnswer = (voice) => ({
  id: voice.id,
  url: voice.url,
  publicId: voice.publicId,
  durationSeconds: voice.durationSeconds,
  transcript: voice.transcript,
  question: voice.voicePrompt?.question ?? null,
  category: voice.voicePrompt?.category ?? null,
  status: voice.status,
  mimeType: voice.mimeType,
  size: voice.size,
  createdAt: voice.createdAt,
  updatedAt: voice.updatedAt,
});

// ---------------------------------------------------------------------------
// Permission Helpers
// ---------------------------------------------------------------------------

const assertCanViewProfile = async (viewerId, targetUserId) => {
  if (viewerId === targetUserId) {
    return true;
  }

  const match = await matchDb.findActiveMatchBetweenUsers(
    viewerId,
    targetUserId,
  );

  if (!match) {
    throw new ForbiddenError("You don't have permission to view this profile");
  }

  return true;
};

const assertCanViewPhoto = async (viewerId, photo) => {
  if (photo.userId === viewerId) {
    return true;
  }

  const match = await matchDb.findActiveMatchBetweenUsers(
    viewerId,
    photo.userId,
  );

  if (!match) {
    throw new ForbiddenError("You don't have permission to view this photo");
  }

  return true;
};

// ---------------------------------------------------------------------------
// Public API - Photos
// ---------------------------------------------------------------------------

export const getUserPhotos = async ({
  viewerId,
  userId,
  status = PHOTO_STATUS.ACTIVE,
  onlyPrimary = false,
}) => {
  await assertCanViewProfile(viewerId, userId);

  const profile = await profileDb.findProfileByUserId(userId);
  if (!profile) {
    throw new NotFoundException("Profile not found");
  }

  const photos = await photoDb.findPhotosByProfileId({
    profileId: profile.id,
    status,
    onlyPrimary,
  });

  const isOwnProfile = viewerId === userId;

  return {
    photos: photos.map(formatPhoto),
    count: photos.length,
    isOwnProfile,
  };
};

export const getPhotoById = async ({ viewerId, photoId }) => {
  const photo = await photoDb.findPhotoById(photoId);

  if (!photo) {
    throw new NotFoundException("Photo not found");
  }

  await assertCanViewPhoto(viewerId, photo);

  return formatPhoto(photo);
};

export const getPrimaryPhoto = async ({ viewerId, userId }) => {
  await assertCanViewProfile(viewerId, userId);

  const profile = await profileDb.findProfileByUserId(userId);
  if (!profile) {
    throw new NotFoundException("Profile not found");
  }

  const photo = await photoDb.findPrimaryPhotoByProfileId(profile.id);

  return photo ? formatPhoto(photo) : null;
};

// ---------------------------------------------------------------------------
// Public API - Voice Answers
// ---------------------------------------------------------------------------

export const getUserVoiceAnswers = async ({
  viewerId,
  userId,
  status = VOICE_STATUS.ACTIVE,
  category = null,
  minDuration = null,
  maxDuration = null,
}) => {
  await assertCanViewProfile(viewerId, userId);

  const profile = await profileDb.findProfileByUserId(userId);
  if (!profile) {
    throw new NotFoundException("Profile not found");
  }

  const voiceAnswers = await voiceDb.findVoiceAnswersByProfileId({
    profileId: profile.id,
    status,
    category,
    minDuration,
    maxDuration,
  });

  const isOwnProfile = viewerId === userId;

  return {
    voiceAnswers: voiceAnswers.map(formatVoiceAnswer),
    count: voiceAnswers.length,
    isOwnProfile,
  };
};

export const getVoiceAnswerById = async ({ viewerId, voiceAnswerId }) => {
  const voiceAnswer = await voiceDb.findVoiceAnswerById(voiceAnswerId);

  if (!voiceAnswer) {
    throw new NotFoundException("Voice answer not found");
  }

  await assertCanViewProfile(viewerId, voiceAnswer.userId);

  return formatVoiceAnswer(voiceAnswer);
};

// ---------------------------------------------------------------------------
// Public API - Combined Media
// ---------------------------------------------------------------------------

export const getUserMedia = async ({
  viewerId,
  userId,
  photoStatus = PHOTO_STATUS.ACTIVE,
  voiceStatus = VOICE_STATUS.ACTIVE,
  onlyPrimary = false,
  category = null,
  minDuration = null,
  maxDuration = null,
}) => {
  await assertCanViewProfile(viewerId, userId);

  const profile = await profileDb.findProfileByUserId(userId);
  if (!profile) {
    throw new NotFoundException("Profile not found");
  }

  const [photos, voiceAnswers] = await Promise.all([
    photoDb.findPhotosByProfileId({
      profileId: profile.id,
      status: photoStatus,
      onlyPrimary,
    }),
    voiceDb.findVoiceAnswersByProfileId({
      profileId: profile.id,
      status: voiceStatus,
      category,
      minDuration,
      maxDuration,
    }),
  ]);

  const isOwnProfile = viewerId === userId;

  return {
    userId,
    isOwnProfile,
    photos: photos.map(formatPhoto),
    voiceAnswers: voiceAnswers.map(formatVoiceAnswer),
    counts: {
      photos: photos.length,
      voiceAnswers: voiceAnswers.length,
      total: photos.length + voiceAnswers.length,
    },
  };
};
