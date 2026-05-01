import prisma from "../config/prisma.js";
import * as onboardingDb from "./onboardingDbService.js";
import * as profileDb from "../profile/profileDbService.js";
import * as profilePhotoDb from "../profile/profilePhotoDbService.js";
import * as voiceAnswerDb from "../profile/voiceAnswerDbService.js";
import { BadRequestError } from "../lib/classes/errorClasses.js";

const CURRENT_DRAFT_VERSION = 1;
const FINAL_ONBOARDING_STEP = 23;

// ─── Helpers ────────────────────────────────────────────────────────────────

const mapGender = (gender) => {
  const map = {
    Woman: "WOMAN",
    Man: "MAN",
    "Non-binary": "NON_BINARY",
  };

  const mapped = map[gender];

  if (!mapped) {
    throw new BadRequestError(`Invalid gender value: ${gender}`);
  }

  return mapped;
};

const parseLanguages = (languages) => {
  if (Array.isArray(languages)) {
    return languages.map((language) => language.trim()).filter(Boolean);
  }

  if (typeof languages === "string") {
    return languages
      .split(",")
      .map((language) => language.trim())
      .filter(Boolean);
  }

  return [];
};

const sanitizeDraftData = (draftData = {}) => {
  const sanitized = { ...draftData };

  delete sanitized.password;
  delete sanitized.confirmPassword;
  delete sanitized.passwordHash;

  return sanitized;
};

const ensureValidDraftVersion = (existing) => {
  const draftVersion = existing?.draftVersion ?? CURRENT_DRAFT_VERSION;

  if (draftVersion !== CURRENT_DRAFT_VERSION) {
    throw new BadRequestError(
      "Outdated onboarding draft. Please refresh and continue.",
    );
  }
};

const buildProfileData = (payload) => {
  const {
    firstName,
    lastName,
    birthDate,
    gender,
    originCountry,
    residenceCountry,
    residenceCity,
    ethnicity,
    languages,
    occupation,
    religion,
    religionImportance,
    drinking,
    smoking,
    socialLife,
    fitnessImportance,
    moneyStyle,
    relocationFeelings,
    financialStatus,
    childrenPreference,
    personalCommStyle,
    personalTuesdayVibe,
    aboutMe,
  } = payload;

  const parsedBirthDate = new Date(birthDate);

  if (Number.isNaN(parsedBirthDate.getTime())) {
    throw new BadRequestError("Invalid birth date");
  }

  if (!firstName || !lastName) {
    throw new BadRequestError("Missing required profile fields");
  }

  return {
    firstName,
    lastName,
    birthDate: parsedBirthDate,
    gender: mapGender(gender),
    originCountry,
    residenceCountry,
    residenceCity,
    ethnicity: ethnicity || null,
    languages: parseLanguages(languages),
    occupation,
    religion,
    religionImportance,
    drinking,
    smoking,
    socialLife,
    fitnessImportance,
    moneyStyle,
    relocationFeelings,
    financialStatus,
    childrenPreference,
    personalCommStyle,
    personalTuesdayVibe,
    aboutMe,
    onboardingCompleted: true,
    completedAt: new Date(),
  };
};

// ─── Service Methods ────────────────────────────────────────────────────────

export const getMyOnboarding = async (userId) => {
  const progress = await onboardingDb.findProgressByUserId(userId);
  return progress ?? null;
};

export const saveProgress = async (userId, payload) => {
  const { currentStep, completedSections = [], draftData = {} } = payload;

  const existing = await onboardingDb.findProgressByUserId(userId);

  if (existing?.status === "COMPLETED") {
    throw new BadRequestError("Onboarding already completed");
  }

  ensureValidDraftVersion(existing);

  const safeDraftData = sanitizeDraftData(draftData);

  const mergedDraftData = {
    ...(existing?.draftData || {}),
    ...safeDraftData,
  };

  const mergedCompletedSections = Array.from(
    new Set([...(existing?.completedSections || []), ...completedSections]),
  );

  return onboardingDb.upsertProgress(userId, {
    currentStep: currentStep ?? existing?.currentStep ?? 1,
    completedSections: mergedCompletedSections,
    draftData: mergedDraftData,
    draftVersion: existing?.draftVersion ?? CURRENT_DRAFT_VERSION,
    status: "IN_PROGRESS",
    startedAt: existing?.startedAt ?? new Date(),
  });
};

export const completeOnboarding = async (userId, payload = {}) => {
  const existing = await onboardingDb.findProgressByUserId(userId);

  if (existing?.status === "COMPLETED") {
    throw new BadRequestError("Onboarding already completed");
  }

  ensureValidDraftVersion(existing);

  const finalPayload = {
    ...(existing?.draftData || {}),
    ...payload,
  };

  const profileData = buildProfileData(finalPayload);

  const profilePhotos = finalPayload.profilePhotos || [];
  const voiceAnswers = finalPayload.voiceAnswers || [];

  if (profilePhotos.length < 2) {
    throw new BadRequestError("Please upload at least 2 profile photos");
  }

  const result = await prisma.$transaction(async (tx) => {
    const profile = await profileDb.upsertProfile(userId, profileData, tx);

    await profilePhotoDb.deleteProfilePhotosByProfileId(profile.id, tx);

    await profilePhotoDb.createProfilePhotos(
      profilePhotos.map((photo, index) => ({
        userId,
        profileId: profile.id,
        url: photo.url,
        publicId: photo.publicId,
        mimeType: photo.mimeType,
        size: photo.size,
        position: photo.position ?? index + 1,
        isPrimary: photo.isPrimary ?? index === 0,
      })),
      tx,
    );

    await voiceAnswerDb.deleteVoiceAnswersByProfileId(profile.id, tx);

    if (voiceAnswers.length) {
      await voiceAnswerDb.createVoiceAnswers(
        voiceAnswers.map((answer) => ({
          userId,
          profileId: profile.id,
          voicePromptId: answer.voicePromptId,
          url: answer.url,
          publicId: answer.publicId,
          mimeType: answer.mimeType,
          size: answer.size,
          durationSeconds: answer.durationSeconds || null,
          transcript: answer.transcript || null,
        })),
        tx,
      );
    }

    const progress = await onboardingDb.upsertProgress(
      userId,
      {
        currentStep: FINAL_ONBOARDING_STEP,
        completedSections: [
          "auth",
          "basics",
          "lifestyle",
          "preferences",
          "voice",
          "photos",
        ],
        draftData: {},
        draftVersion: CURRENT_DRAFT_VERSION,
        status: "COMPLETED",
        completedAt: new Date(),
      },
      tx,
    );

    const user = await tx.user.update({
      where: { id: userId },
      data: {
        onboardingStatus: "COMPLETED",
      },
    });

    return { profile, progress, user };
  });

  return {
    profile: result.profile,
    onboardingStatus: result.progress.status,
  };
};

export const resetOnboarding = async (userId) => {
  const result = await prisma.$transaction(async (tx) => {
    const profile = await profileDb.findProfileByUserId(userId, tx);

    if (profile) {
      await profilePhotoDb.deleteProfilePhotosByProfileId(profile.id, tx);
      await voiceAnswerDb.deleteVoiceAnswersByProfileId(profile.id, tx);

      await tx.profile.delete({
        where: { id: profile.id },
      });
    }

    const progress = await onboardingDb.upsertProgress(
      userId,
      {
        currentStep: 1,
        completedSections: [],
        draftData: {},
        draftVersion: CURRENT_DRAFT_VERSION,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        completedAt: null,
      },
      tx,
    );

    const user = await tx.user.update({
      where: { id: userId },
      data: {
        onboardingStatus: "IN_PROGRESS",
      },
    });

    return { progress, user };
  });

  return {
    onboarding: result.progress,
    onboardingStatus: result.user.onboardingStatus,
  };
};
