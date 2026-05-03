import { BadRequestError } from "../../lib/classes/errorClasses.js";
import * as matchPreferenceDb from "../matchPreference/matchPreference.db.js";
import * as discoveryDb from "./discovery.db.js";

const calculateAge = (birthDate) => {
  if (!birthDate) return null;

  const today = new Date();
  const dob = new Date(birthDate);

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dob.getDate())
  ) {
    age -= 1;
  }

  return age;
};

const calculateBasicCompatibilityScore = (viewerPreference, candidate) => {
  let score = 60;

  const profile = candidate.profile;

  if (!profile) return 0;

  if (
    viewerPreference.preferredGenders?.length &&
    viewerPreference.preferredGenders.includes(profile.gender)
  ) {
    score += 10;
  }

  if (
    viewerPreference.religionPreference &&
    viewerPreference.religionPreference !== "Open to all" &&
    profile.religion
  ) {
    score += 5;
  }

  if (
    viewerPreference.childrenPreference &&
    profile.childrenPreference === viewerPreference.childrenPreference
  ) {
    score += 5;
  }

  if (
    viewerPreference.communicationStyle &&
    profile.personalCommStyle === viewerPreference.communicationStyle
  ) {
    score += 5;
  }

  if (
    viewerPreference.tuesdayFeeling &&
    profile.personalTuesdayVibe === viewerPreference.tuesdayFeeling
  ) {
    score += 5;
  }

  return Math.min(score, 98);
};

const formatDiscoveryCandidate = ({ candidate, score }) => {
  const profile = candidate.profile;
  const primaryPhoto = candidate.profilePhotos?.[0] || null;
  const firstVoiceAnswer = candidate.voiceAnswers?.[0] || null;

  return {
    id: candidate.id,
    profileId: profile.id,

    name: `${profile.firstName} ${profile.lastName}`.trim(),
    firstName: profile.firstName,
    lastName: profile.lastName,

    age: calculateAge(profile.birthDate),
    gender: profile.gender,

    city: profile.residenceCity,
    country: profile.residenceCountry,

    occupation: profile.occupation,
    languages: profile.languages,

    aboutMe: profile.aboutMe,
    snippet: profile.aboutMe,

    photo: primaryPhoto?.url || null,
    photos: candidate.profilePhotos,

    matchScore: score,

    voicePrompt: firstVoiceAnswer
      ? {
          id: firstVoiceAnswer.id,
          url: firstVoiceAnswer.url,
          durationSeconds: firstVoiceAnswer.durationSeconds,
          transcript: firstVoiceAnswer.transcript,
          question: firstVoiceAnswer.voicePrompt?.question || null,
          category: firstVoiceAnswer.voicePrompt?.category || null,
        }
      : null,
  };
};

export const requestDiscoveryMatches = async (viewerId, trx = null) => {
  const preference = await matchPreferenceDb.findByUserId(viewerId, trx);

  if (!preference) {
    throw new BadRequestError("Set your match preferences before requesting matches");
  }

  const candidates = await discoveryDb.findDiscoveryCandidates({
    viewerId,
    preferredGenders: preference.preferredGenders,
    limit: 2,
    trx,
  });

  const formattedCandidates = candidates.map((candidate) => {
    const score = calculateBasicCompatibilityScore(preference, candidate);

    return formatDiscoveryCandidate({
      candidate,
      score,
    });
  });

  const matchResultsPayload = formattedCandidates.map((candidate) => ({
    viewerId,
    candidateId: candidate.id,
    score: candidate.matchScore,
    reason:
      candidate.matchScore >= preference.minCompatibilityScore
        ? "COMPATIBLE"
        : "LOW_SCORE",
    dismissed: false,
  }));

  await discoveryDb.createManyMatchResults(matchResultsPayload, trx);

  return formattedCandidates;
};

export const getLatestDiscoveryMatches = async (viewerId, trx = null) => {
  const results = await discoveryDb.findViewerMatchResults({
    viewerId,
    limit: 2,
    trx,
  });

  return results.map((result) => {
    const candidate = result.candidate;

    return formatDiscoveryCandidate({
      candidate,
      score: result.score || 0,
    });
  });
};