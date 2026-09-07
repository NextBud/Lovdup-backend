import prisma from "../../../config/prisma.js";
import { BadRequestError } from "../../../classes/errorClasses.js";
import { getPrice } from "../../../config/pricing.service.js";
import {
  WalletReferenceType,
  WalletTransactionReason,
} from "../../finance/wallet/wallet.constants.js";
import * as walletService from "../../finance/wallet/wallet.service.js";
import * as matchPreferenceDb from "../matchRequest/matchPreference.db.js";
import * as discoveryDb from "./discovery.db.js";
import * as compatibilityScoreService from "./compatibilityScore.service.js";
import * as matchDb from "../match/match.db.js";

const CANDIDATE_POOL_LIMIT = 20;
const DISCOVERY_RESULT_LIMIT = 2;

const dbClient = (trx) => trx || prisma;

const calculateAge = (birthDate) => {
  if (!birthDate) return null;

  const today = new Date();
  const dob = new Date(birthDate);

  let age = today.getFullYear() - dob.getFullYear();

  const month = today.getMonth() - dob.getMonth();

  if (month < 0 || (month === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
};

const formatDiscoveryCandidate = ({ candidate, score, matchId }) => {
  const profile = candidate.profile;
  const identity = profile?.identity ?? null;
  const narrative = profile?.narrative ?? null;

  const primaryPhoto = candidate.profilePhotos?.[0] ?? null;

  return {
    id: candidate.id,
    matchId: matchId ?? null,
    profileId: profile?.id ?? null,

    firstName: identity?.firstName ?? null,
    lastName: identity?.lastName ?? null,

    name: identity ? `${identity.firstName} ${identity.lastName}`.trim() : null,

    age: calculateAge(identity?.birthDate),

    gender: identity?.gender ?? null,

    city: identity?.residenceCity ?? null,

    country: identity?.residenceCountry ?? null,

    occupation: identity?.occupation ?? null,

    languages: identity?.languages ?? [],

    aboutMe: narrative?.aboutMe ?? null,

    snippet: narrative?.aboutMe ?? null,

    photo: primaryPhoto?.url ?? null,

    photos: candidate.profilePhotos ?? [],

    matchScore: score,
  };
};

const generateDiscoveryMatches = async (viewerId) => {
  console.log(`[Discovery] Starting discovery for user ${viewerId}`);

  const preference = await matchPreferenceDb.findByUserId(viewerId);
  if (!preference) {
    throw new BadRequestError(
      "Set your match preferences before requesting matches",
    );
  }

  console.log(`[Discovery] User preferences:`, {
    ageMin: preference.ageMin,
    ageMax: preference.ageMax,
    preferredGenders: preference.preferredGenders,
    minCompatibilityScore: preference.minCompatibilityScore,
  });

  const viewerProfile = await prisma.profile.findUnique({
    where: { userId: viewerId },
    include: { identity: true },
  });

  if (!viewerProfile) {
    throw new BadRequestError(
      "You must complete your profile before requesting matches",
    );
  }

  const candidates = await discoveryDb.findDiscoveryCandidates({
    viewerId,
    preferredGenders: preference.preferredGenders,
    ageMin: preference.ageMin,
    ageMax: preference.ageMax,
    limit: CANDIDATE_POOL_LIMIT,
  });

  console.log(`[Discovery] Found ${candidates.length} candidates`);

  if (candidates.length === 0) {
    console.log(`[Discovery] No candidates found for user ${viewerId}`);
    return [];
  }

  // Score sequentially (or with limited concurrency) OUTSIDE any transaction
  const scoredCandidates = [];
  for (const candidate of candidates) {
    try {
      const compatibilityScore =
        await compatibilityScoreService.calculateAndUpsertCompatibilityScore({
          viewerId,
          candidate,
          viewerPreference: preference,
          viewerIdentity: viewerProfile?.identity ?? null,
        });

      console.log(
        `[Discovery] Score for candidate ${candidate.id}: ${compatibilityScore.score}`,
      );

      scoredCandidates.push({ candidate, compatibilityScore });
    } catch (error) {
      console.error(
        `[Discovery] Failed to score candidate ${candidate.id}:`,
        error,
      );
      // Still include with 0 score
      scoredCandidates.push({
        candidate,
        compatibilityScore: {
          id: null,
          score: 0,
          identityScore: 0,
          valuesScore: 0,
          lifestyleScore: 0,
          locationScore: 0,
          reasons: { matched: [], missed: ["Error calculating score"] },
        },
      });
    }
  }

  const filteredCandidates = scoredCandidates.filter(
    ({ compatibilityScore }) =>
      compatibilityScore.score >= preference.minCompatibilityScore,
  );

  console.log(
    `[Discovery] ${filteredCandidates.length} candidates met min score of ${preference.minCompatibilityScore}`,
  );

  const rankedCandidates = filteredCandidates
    .sort((a, b) => b.compatibilityScore.score - a.compatibilityScore.score)
    .slice(0, DISCOVERY_RESULT_LIMIT);

  console.log(
    `[Discovery] Selected ${rankedCandidates.length} candidates for matches`,
  );

  if (!rankedCandidates.length) {
    console.log(`[Discovery] No candidates passed the minimum score threshold`);
    return [];
  }

  const price = getPrice("matching.discovery");
  const matchResultsPayload = rankedCandidates.map(
    ({ candidate, compatibilityScore }, index) => ({
      viewerId,
      candidateId: candidate.id,
      compatibilityScoreId: compatibilityScore.id,
      score: compatibilityScore.score || 0,
      rank: index + 1,
      reason: "COMPATIBLE",
      dismissed: false,
    }),
  );

  // Transaction
  await prisma.$transaction(async (tx) => {
    await walletService.debitCoins({
      userId: viewerId,
      coins: price.amount,
      reason: price.action,
      referenceType: WalletReferenceType.MATCH,
      referenceId: null,
      metadata: { source: "discovery", description: price.description },
      db: tx,
    });

    await discoveryDb.createManyMatchResults(matchResultsPayload, tx);

    const matchPromises = rankedCandidates.map(({ candidate }) =>
      matchDb.createMatchIfNotExists(
        {
          userAId: viewerId,
          userBId: candidate.id,
        },
        tx,
      ),
    );
    await Promise.all(matchPromises);
  });

  console.log(`[Discovery] Successfully created matches for user ${viewerId}`);

  // After transaction, fetch the created matches to get match IDs
  const formattedMatches = [];
  for (const { candidate, compatibilityScore } of rankedCandidates) {
    const match = await matchDb.findMatchBetweenUsers({
      userAId: viewerId,
      userBId: candidate.id,
    });
    formattedMatches.push(
      formatDiscoveryCandidate({
        candidate,
        score: compatibilityScore.score || 0,
        matchId: match?.id ?? null,
      }),
    );
  }

  return formattedMatches;
};

export const requestDiscoveryMatches = (viewerId) =>
  generateDiscoveryMatches(viewerId);

export const getLatestDiscoveryMatches = async (viewerId, trx = null) => {
  const results = await discoveryDb.findViewerMatchResults({
    viewerId,
    limit: DISCOVERY_RESULT_LIMIT,
    trx,
  });

  const formatted = [];
  for (const result of results) {
    const match = await matchDb.findMatchBetweenUsers({
      userAId: viewerId,
      userBId: result.candidateId,
      trx,
    });
    formatted.push(
      formatDiscoveryCandidate({
        candidate: result.candidate,
        score: result.score ?? 0,
        matchId: match?.id ?? null,
      }),
    );
  }
  return formatted;
};
