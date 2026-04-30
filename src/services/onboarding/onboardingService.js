import prisma from "../config/prisma.js";
import * as onboardingDb from "./onboardingDbService.js";
import * as profileDb from "../profile/profileDbService.js";
import { BadRequestError } from "../lib/classes/errorClasses.js";

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
    return languages.map((l) => l.trim()).filter(Boolean);
  }

  if (typeof languages === "string") {
    return languages
      .split(",")
      .map((l) => l.trim())
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
    status: "IN_PROGRESS",
  });
};

export const completeOnboarding = async (userId, payload = {}) => {
  const existing = await onboardingDb.findProgressByUserId(userId);

  if (existing?.status === "COMPLETED") {
    throw new BadRequestError("Onboarding already completed");
  }

  // Merge cache + final payload (cache-first architecture)
  const finalPayload = {
    ...(existing?.draftData || {}),
    ...payload,
  };

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
    voicePrompts,
  } = finalPayload;

  // ─── Critical Validation ────────────────────────────────────────────────

  const parsedBirthDate = new Date(birthDate);

  if (Number.isNaN(parsedBirthDate.getTime())) {
    throw new BadRequestError("Invalid birth date");
  }

  if (!firstName || !lastName) {
    throw new BadRequestError("Missing required profile fields");
  }

  // ─── Build Profile Data ────────────────────────────────────────────────

  const profileData = {
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
    voicePrompts: voicePrompts || [],
    photos: finalPayload.photos || [],
    voiceRecordings: finalPayload.voiceRecordings || [],
  };

  // ─── Transaction ───────────────────────────────────────────────────────

  const result = await prisma.$transaction(async (tx) => {
    const profile = await profileDb.upsertProfile(userId, profileData, tx);

    const progress = await onboardingDb.upsertProgress(
      userId,
      {
        currentStep: 23,
        completedSections: [
          "auth",
          "basics",
          "lifestyle",
          "preferences",
          "voice",
          "photos",
        ],
        draftData: {},
        status: "COMPLETED",
        completedAt: new Date(),
      },
      tx,
    );

    const user = await tx.user.update({
      where: { id: userId },
      data: {
        onboardingStatus: "COMPLETED",
        profileCompleted: true,
      },
    });

    return { profile, progress, user };
  });

  return {
    profile: result.profile,
    onboardingStatus: result.progress.status,
    profileCompleted: result.user.profileCompleted,
  };
};
