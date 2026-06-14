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
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
};

/**
 * Map a raw candidate row (with nested profile sub-relations) to the
 * shape consumed by the frontend and the compatibility scorer.
 *
 * profile.identity  → name, age, gender, location, occupation, languages
 * profile.lifestyle → (scoring only, not surfaced directly)
 * profile.values    → (scoring only, not surfaced directly)
 * profile.narrative → aboutMe / snippet
 */
const formatDiscoveryCandidate = ({ candidate, score }) => {
  const profile = candidate.profile;
  const identity = profile?.identity ?? null;
  const narrative = profile?.narrative ?? null;

  const primaryPhoto = candidate.profilePhotos?.[0] ?? null;
  const firstVoiceAnswer = candidate.voiceAnswers?.[0] ?? null;

  return {
    id: candidate.id,
    profileId: profile?.id ?? null,

    // Identity fields
    firstName: identity?.firstName ?? null,
    lastName: identity?.lastName ?? null,
    name: identity ? `${identity.firstName} ${identity.lastName}`.trim() : null,
    age: calculateAge(identity?.birthDate),
    gender: identity?.gender ?? null,
    city: identity?.residenceCity ?? null,
    country: identity?.residenceCountry ?? null,
    occupation: identity?.occupation ?? null,
    languages: identity?.languages ?? [],

    // Narrative
    aboutMe: narrative?.aboutMe ?? null,
    snippet: narrative?.aboutMe ?? null,

    // Media
    photo: primaryPhoto?.url ?? null,
    photos: candidate.profilePhotos ?? [],

    // Match score
    matchScore: score,

    // First voice answer for the card preview
    voicePrompt: firstVoiceAnswer
      ? {
          id: firstVoiceAnswer.id,
          url: firstVoiceAnswer.url,
          durationSeconds: firstVoiceAnswer.durationSeconds,
          transcript: firstVoiceAnswer.transcript,
          question: firstVoiceAnswer.voicePrompt?.question ?? null,
          category: firstVoiceAnswer.voicePrompt?.category ?? null,
        }
      : null,
  };
};

// ---------------------------------------------------------------------------
// Core generation logic (always called inside a transaction)
// ---------------------------------------------------------------------------

const generateDiscoveryMatches = async (viewerId, trx) => {
  const preference = await matchPreferenceDb.findByUserId(viewerId, trx);

  if (!preference) {
    throw new BadRequestError(
      "Set your match preferences before requesting matches",
    );
  }

  // Debit coins before doing any DB-heavy work so we fail fast if the
  // wallet is empty.
  const price = getPrice("discovery.requestMatches");

  await walletService.debitCoins({
    userId: viewerId,
    amount: price.amount,
    reason: price.action,
    description: price.description,
    metadata: { source: "discovery" },
    trx,
  });

  // Pull candidate pool — gender and age range already applied at DB level.
  const candidates = await discoveryDb.findDiscoveryCandidates({
    viewerId,
    preferredGenders: preference.preferredGenders,
    ageMin: preference.ageMin,
    ageMax: preference.ageMax,
    limit: CANDIDATE_POOL_LIMIT,
    trx,
  });

  // Score every candidate in the pool.
  const scoredCandidates = await Promise.all(
    candidates.map(async (candidate) => {
      const compatibilityScore =
        await compatibilityScoreService.calculateAndUpsertCompatibilityScore({
          viewerId,
          candidate,
          viewerPreference: preference,
          trx,
        });

      return { candidate, compatibilityScore };
    }),
  );

  // Filter by viewer's minimum score threshold, then take the top N.
  const rankedCandidates = scoredCandidates
    .filter(
      ({ compatibilityScore }) =>
        compatibilityScore.score >= preference.minCompatibilityScore,
    )
    .sort((a, b) => b.compatibilityScore.score - a.compatibilityScore.score)
    .slice(0, DISCOVERY_RESULT_LIMIT);

  if (!rankedCandidates.length) {
    return [];
  }

  // Persist match results so these candidates are excluded from future pools.
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

  return rankedCandidates.map(({ candidate, compatibilityScore }) =>
    formatDiscoveryCandidate({ candidate, score: compatibilityScore.score }),
  );
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const requestDiscoveryMatches = async (viewerId, trx = null) => {
  if (trx) {
    return generateDiscoveryMatches(viewerId, trx);
  }

  return prisma.$transaction((transactionClient) =>
    generateDiscoveryMatches(viewerId, transactionClient),
  );
};

export const getLatestDiscoveryMatches = async (viewerId, trx = null) => {
  const results = await discoveryDb.findViewerMatchResults({
    viewerId,
    limit: DISCOVERY_RESULT_LIMIT,
    trx,
  });

  return results.map((result) =>
    formatDiscoveryCandidate({
      candidate: result.candidate,
      score: result.score ?? 0,
    }),
  );
};
