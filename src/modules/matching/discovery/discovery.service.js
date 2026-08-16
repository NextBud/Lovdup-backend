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

const formatDiscoveryCandidate = ({ candidate, score }) => {
  const profile = candidate.profile;
  const identity = profile?.identity ?? null;
  const narrative = profile?.narrative ?? null;

  const primaryPhoto = candidate.profilePhotos?.[0] ?? null;
  const firstVoiceAnswer = candidate.voiceAnswers?.[0] ?? null;

  return {
    id: candidate.id,
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

const generateDiscoveryMatches = async (viewerId, trx) => {
  const db = dbClient(trx);

  const preference = await matchPreferenceDb.findByUserId(viewerId, trx);

  if (!preference) {
    throw new BadRequestError(
      "Set your match preferences before requesting matches",
    );
  }

  const viewerProfile = await db.profile.findUnique({
    where: {
      userId: viewerId,
    },
    include: {
      identity: true,
    },
  });

  const candidates = await discoveryDb.findDiscoveryCandidates({
    viewerId,
    preferredGenders: preference.preferredGenders,
    ageMin: preference.ageMin,
    ageMax: preference.ageMax,
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
          viewerIdentity: viewerProfile?.identity ?? null,
          trx,
        });

      return {
        candidate,
        compatibilityScore,
      };
    }),
  );

  const rankedCandidates = scoredCandidates
    .filter(
      ({ compatibilityScore }) =>
        compatibilityScore.score >= preference.minCompatibilityScore,
    )
    .sort((a, b) => b.compatibilityScore.score - a.compatibilityScore.score)
    .slice(0, DISCOVERY_RESULT_LIMIT);

  // Nothing worth showing → don't charge.
  if (!rankedCandidates.length) {
    return [];
  }

  // -----------------------------------------
  // Charge for successful discovery
  // -----------------------------------------

  const price = getPrice("matching.discovery");

  await walletService.debitCoins({
    userId: viewerId,
    coins: price.amount,
    reason: price.action,
    referenceType: WalletReferenceType.MATCH,
    referenceId: null,
    metadata: {
      source: "discovery",
      description: price.description,
    },
    db: trx,
  });

  // -----------------------------------------
  // Persist discovery results
  // -----------------------------------------

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
    formatDiscoveryCandidate({
      candidate,
      score: compatibilityScore.score,
    }),
  );
};


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
