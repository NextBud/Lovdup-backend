import prisma from "../../config/prisma.js";
import {
  NotFoundException,
  BadRequestError,
} from "../../classes/errorClasses.js";
import * as profileDb from "./profileDbService.js";
import * as profilePhotoDb from "./profilePhotoDbService.js";
import * as voiceAnswerDb from "./voiceAnswerDbService.js";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const calculateAge = (birthDate) => {
  if (!birthDate) return null;

  const date = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const today = new Date();
  let age = today.getUTCFullYear() - year;

  if (
    today.getUTCMonth() + 1 < month ||
    (today.getUTCMonth() + 1 === month && today.getUTCDate() < day)
  ) {
    age--;
  }

  return age;
};

const formatProfile = (profile) => {
  if (!profile) return null;

  const {
    identity,
    lifestyle,
    values,
    narrative,
    profilePhotos,
    voiceAnswers,
  } = profile;

  return {
    id: profile.id,
    userId: profile.userId,
    completionPercent: profile.completionPercent,
    onboardingCompleted: profile.onboardingCompleted,

    // Identity
    firstName: identity?.firstName ?? null,
    lastName: identity?.lastName ?? null,
    name: identity ? `${identity.firstName} ${identity.lastName}`.trim() : null,
    age: calculateAge(identity?.birthDate),
    birthDate: identity?.birthDate ?? null,
    gender: identity?.gender ?? null,
    originCountry: identity?.originCountry ?? null,
    residenceCountry: identity?.residenceCountry ?? null,
    residenceCity: identity?.residenceCity ?? null,
    ethnicity: identity?.ethnicity ?? null,
    languages: identity?.languages ?? [],
    occupation: identity?.occupation ?? null,
    relationshipIntention: identity?.relationshipIntention ?? null,
    education: identity?.education ?? null,

    // Lifestyle
    drinking: lifestyle?.drinking ?? null,
    smoking: lifestyle?.smoking ?? null,
    socialLife: lifestyle?.socialLife ?? null,
    fitnessImportance: lifestyle?.fitnessImportance ?? null,
    moneyStyle: lifestyle?.moneyStyle ?? null,
    relocationFeelings: lifestyle?.relocationFeelings ?? null,
    financialStatus: lifestyle?.financialStatus ?? null,

    // Values
    religion: values?.religion ?? null,
    religionImportance: values?.religionImportance ?? null,
    childrenPreference: values?.childrenPreference ?? null,
    hasChildren: values?.hasChildren ?? false,
    personalCommStyle: values?.personalCommStyle ?? null,
    personalTuesdayVibe: values?.personalTuesdayVibe ?? null,

    // Narrative
    aboutMe: narrative?.aboutMe ?? null,

    // Media
    photos: profilePhotos ?? [],
    photo: profilePhotos?.[0]?.url ?? null,

    // voiceAnswers: (voiceAnswers ?? []).map((a) => ({
    //   id: a.id,
    //   url: a.url,
    //   durationSeconds: a.durationSeconds,
    //   transcript: a.transcript,
    //   question: a.voicePrompt?.question ?? null,
    //   category: a.voicePrompt?.category ?? null,
    // })),
  };
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const getMyProfile = async (userId) => {
  const profile = await profileDb.findProfileByUserId(userId);
  return formatProfile(profile);
};

// ---------------------------------------------------------------------------
// Section writes — each one is an independent endpoint so the onboarding
// can save progress step by step without requiring all sections at once.
// Every write recalculates completionPercent afterward.
// ---------------------------------------------------------------------------

/**
 * Upsert the identity section (step 1–6 of onboarding).
 * Creates the Profile shell if it doesn't exist yet.
 */
export const upsertIdentity = async (userId, payload) => {
  return prisma.$transaction(async (tx) => {
    const profile = await profileDb.createProfileShell(userId, tx);

    await profileDb.upsertProfileIdentity(profile.id, payload, tx);

    const { completionPercent, onboardingCompleted, completedAt } =
      await profileDb.recalculateCompletionPercent(profile.id, tx);

    return {
      profileId: profile.id,
      completionPercent,
      onboardingCompleted,
      completedAt,
    };
  });
};

/**
 * Upsert the lifestyle section (steps 8–11).
 */
export const upsertLifestyle = async (userId, payload) => {
  return prisma.$transaction(async (tx) => {
    const profile = await profileDb.findProfileByUserId(userId, tx);

    if (!profile) {
      throw new BadRequestError(
        "Complete your identity section before saving lifestyle details",
      );
    }

    await profileDb.upsertProfileLifestyle(profile.id, payload, tx);

    const { completionPercent, onboardingCompleted, completedAt } =
      await profileDb.recalculateCompletionPercent(profile.id, tx);

    return {
      profileId: profile.id,
      completionPercent,
      onboardingCompleted,
      completedAt,
    };
  });
};

/**
 * Upsert the values section (steps 7, 12–14).
 */
export const upsertValues = async (userId, payload) => {
  return prisma.$transaction(async (tx) => {
    const profile = await profileDb.findProfileByUserId(userId, tx);

    if (!profile) {
      throw new BadRequestError(
        "Complete your identity section before saving values",
      );
    }

    await profileDb.upsertProfileValues(profile.id, payload, tx);

    const { completionPercent, onboardingCompleted, completedAt } =
      await profileDb.recalculateCompletionPercent(profile.id, tx);

    return {
      profileId: profile.id,
      completionPercent,
      onboardingCompleted,
      completedAt,
    };
  });
};

/**
 * Upsert the narrative section (step 15).
 */
export const upsertNarrative = async (userId, payload) => {
  return prisma.$transaction(async (tx) => {
    const profile = await profileDb.findProfileByUserId(userId, tx);

    if (!profile) {
      throw new BadRequestError(
        "Complete your identity section before saving your narrative",
      );
    }

    await profileDb.upsertProfileNarrative(profile.id, payload, tx);

    const { completionPercent, onboardingCompleted, completedAt } =
      await profileDb.recalculateCompletionPercent(profile.id, tx);

    return {
      profileId: profile.id,
      completionPercent,
      onboardingCompleted,
      completedAt,
    };
  });
};

// ---------------------------------------------------------------------------
// Photos — replaces existing active photos for the profile
// ---------------------------------------------------------------------------

export const saveProfilePhotos = async (userId, photos) => {
  return prisma.$transaction(async (tx) => {
    const profile = await profileDb.findProfileByUserId(userId, tx);

    if (!profile) {
      throw new BadRequestError(
        "Complete your identity section before uploading photos",
      );
    }

    // Soft-delete existing photos before writing new ones
    await profilePhotoDb.deleteProfilePhotosByProfileId(profile.id, tx);

    const photoRecords = photos.map((photo, index) => ({
      userId,
      profileId: profile.id,
      url: photo.url,
      publicId: photo.publicId,
      mimeType: photo.mimeType,
      size: photo.size,
      position: index + 1,
      isPrimary: index === 0,
      status: "ACTIVE",
    }));

    await profilePhotoDb.createProfilePhotos(photoRecords, tx);

    const { completionPercent, onboardingCompleted, completedAt } =
      await profileDb.recalculateCompletionPercent(profile.id, tx);

    return {
      profileId: profile.id,
      completionPercent,
      onboardingCompleted,
      completedAt,
    };
  });
};

// ---------------------------------------------------------------------------
// Voice answers — replaces existing answers for the profile
// ---------------------------------------------------------------------------

export const saveVoiceAnswers = async (userId, answers) => {
  return prisma.$transaction(async (tx) => {
    const profile = await profileDb.findProfileByUserId(userId, tx);

    if (!profile) {
      throw new BadRequestError(
        "Complete your identity section before saving voice answers",
      );
    }

    await voiceAnswerDb.deleteVoiceAnswersByProfileId(profile.id, tx);

    const answerRecords = answers.map((answer) => ({
      userId,
      profileId: profile.id,
      voicePromptId: answer.voicePromptId,
      url: answer.url,
      publicId: answer.publicId,
      mimeType: answer.mimeType,
      size: answer.size,
      durationSeconds: answer.durationSeconds ?? null,
      status: "ACTIVE",
    }));

    await voiceAnswerDb.createVoiceAnswers(answerRecords, tx);

    const { completionPercent, onboardingCompleted, completedAt } =
      await profileDb.recalculateCompletionPercent(profile.id, tx);

    return {
      profileId: profile.id,
      completionPercent,
      onboardingCompleted,
      completedAt,
    };
  });
};
