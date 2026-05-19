import prisma from "../../config/prisma.js";
import { BadRequestError } from "../../lib/classes/errorClasses.js";
import { getPrice } from "../../config/pricing.service.js";
import * as walletService from "../../wallet/wallet.service.js";
import * as matchPreferenceDb from "../matchPreference/matchPreference.db.js";
import * as discoveryDb from "./discovery.db.js";
import * as compatibilityScoreService from "../compatibilityScore/compatibilityScore.service.js";

const CANDIDATE_POOL_LIMIT = 20;
const DISCOVERY_RESULT_LIMIT = 2;

const calculateAge = (birthDate) => {
  if (!birthDate) return null;

  const today = new Date();
  const dob = new Date(birthDate);

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
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

const generateDiscoveryMatches = async (viewerId, trx) => {
  const preference = await matchPreferenceDb.findByUserId(viewerId, trx);

  if (!preference) {
    throw new BadRequestError(
      "Set your match preferences before requesting matches",
    );
  }

  const price = getPrice("discovery.requestMatches");

  await walletService.debitCoins({
    userId: viewerId,
    amount: price.amount,
    reason: price.action,
    description: price.description,
    metadata: {
      source: "discovery",
    },
    trx,
  });

  const candidates = await discoveryDb.findDiscoveryCandidates({
    viewerId,
    preferredGenders: preference.preferredGenders,
    limit: CANDIDATE_POOL_LIMIT,
    trx,
  });

  const scoredCandidates = await Promise.all(
    candidates.map(async (candidate) => {
      const compatibilityScore =
        await compatibilityScoreService.calculateAndUpsertCompatibilityScore({
          viewerId,
          candidate,
          viewerPreference: preference,
          trx,
        });

      return {
        candidate,
        compatibilityScore,
      };
    }),
  );

  const rankedCandidates = scoredCandidates
    .filter(({ compatibilityScore }) => {
      return compatibilityScore.score >= preference.minCompatibilityScore;
    })
    .sort((a, b) => {
      return b.compatibilityScore.score - a.compatibilityScore.score;
    })
    .slice(0, DISCOVERY_RESULT_LIMIT);

  if (!rankedCandidates.length) {
    return [];
  }

  const formattedCandidates = rankedCandidates.map(
    ({ candidate, compatibilityScore }) => {
      return formatDiscoveryCandidate({
        candidate,
        score: compatibilityScore.score,
      });
    },
  );

  const matchResultsPayload = rankedCandidates.map(
    ({ candidate, compatibilityScore }, index) => ({
      viewerId,
      candidateId: candidate.id,
      compatibilityScoreId: compatibilityScore.id,
      score: compatibilityScore.score,
      rank: index + 1,
      reason: "COMPATIBLE",
      dismissed: false,
    }),
  );

  await discoveryDb.createManyMatchResults(matchResultsPayload, trx);

  return formattedCandidates;
};

export const requestDiscoveryMatches = async (viewerId, trx = null) => {
  if (trx) {
    return generateDiscoveryMatches(viewerId, trx);
  }

  return prisma.$transaction(async (transactionClient) => {
    return generateDiscoveryMatches(viewerId, transactionClient);
  });
};

export const getLatestDiscoveryMatches = async (viewerId, trx = null) => {
  const results = await discoveryDb.findViewerMatchResults({
    viewerId,
    limit: DISCOVERY_RESULT_LIMIT,
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
