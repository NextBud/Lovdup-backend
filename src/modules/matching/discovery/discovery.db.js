import prisma from "../../../config/prisma.js";

const dbClient = (trx) => trx || prisma;

/**
 * Compute the birth date boundaries for an age range so Postgres can
 * filter on the indexed birthDate column rather than computing age
 * in application memory over the full user table.
 *
 * age 25 today  →  birthDate <= (today - 25 years)
 * age 35 today  →  birthDate >= (today - 35 years)
 */
const birthDateBoundsFromAgeRange = (ageMin, ageMax) => {
  const today = new Date();

  const oldestBirthDate = new Date(today);
  oldestBirthDate.setFullYear(today.getFullYear() - ageMax);

  const youngestBirthDate = new Date(today);
  youngestBirthDate.setFullYear(today.getFullYear() - ageMin);

  return { oldestBirthDate, youngestBirthDate };
};

/**
 * Pull a pool of candidates for the viewer to score.
 *
 * Filtering applied here (cheap, index-backed):
 *   - Not the viewer
 *   - Active account
 *   - Has a completed profile (all four sub-relations must exist)
 *   - Gender matches viewer preference (if set)
 *   - Birth date within viewer's age range
 *   - Not already shown to viewer as a MatchResult
 *   - Viewer hasn't already sent them a MatchRequest
 *   - No active match already exists between them
 *   - Neither user has blocked the other
 */
// discovery.db.js - Fix the blocks filter
export const findDiscoveryCandidates = async ({
  viewerId,
  preferredGenders = [],
  ageMin = 18,
  ageMax = 99,
  limit = 20,
  trx = null,
}) => {
  const db = dbClient(trx);

  const { oldestBirthDate, youngestBirthDate } = birthDateBoundsFromAgeRange(
    ageMin,
    ageMax,
  );

  return db.user.findMany({
    where: {
      id: { not: viewerId },
      status: "ACTIVE",
      isActive: true,
      isSuspended: false,

      profile: {
        isNot: null,
        identity: {
          isNot: null,
          ...(preferredGenders.length > 0
            ? { gender: { in: preferredGenders } }
            : {}),
          birthDate: {
            gte: oldestBirthDate,
            lte: youngestBirthDate,
          },
        },
        lifestyle: { isNot: null },
        values: { isNot: null },
        narrative: { isNot: null },
      },

      // Exclude anyone already in this viewer's match result history
      candidateMatchResults: {
        none: { viewerId },
      },

      // Exclude anyone the viewer has already sent a request to
      receivedMatchRequests: {
        none: { senderId: viewerId },
      },

      // Exclude existing active matches
      matchesAsUserA: {
        none: { userBId: viewerId, status: "ACTIVE" },
      },
      matchesAsUserB: {
        none: { userAId: viewerId, status: "ACTIVE" },
      },

      // FIX: Exclude blocks in both directions using UserBlock relations
      blocksReceived: { 
        none: { blockerId: viewerId } 
      },
      blocksCreated: { 
        none: { blockedId: viewerId } 
      },
    },

    select: {
      id: true,
      profile: {
        select: {
          id: true,
          identity: true,
          lifestyle: true,
          values: true,
          narrative: true,
        },
      },
      profilePhotos: {
        where: { status: "ACTIVE" },
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        select: {
          id: true,
          url: true,
          position: true,
          isPrimary: true,
        },
      },
      voiceAnswers: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          url: true,
          durationSeconds: true,
          transcript: true,
          voicePrompt: {
            select: {
              id: true,
              question: true,
              category: true,
            },
          },
        },
      },
    },

    take: limit,
  });
};


export const createManyMatchResults = async (payloads, trx = null) => {
  const db = dbClient(trx);

  if (!payloads.length) return { count: 0 };

  return db.matchResult.createMany({
    data: payloads,
    skipDuplicates: true,
  });
};

export const findViewerMatchResults = async ({
  viewerId,
  limit = 2,
  trx = null,
}) => {
  const db = dbClient(trx);

  return db.matchResult.findMany({
    where: {
      viewerId,
      dismissed: false,
    },
    orderBy: { shownAt: "desc" },
    take: limit,
    include: {
      candidate: {
        select: {
          id: true,
          profile: {
            select: {
              id: true,
              identity: true,
              lifestyle: true,
              values: true,
              narrative: true,
            },
          },
          profilePhotos: {
            where: { status: "ACTIVE" },
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          },
          voiceAnswers: {
            where: { status: "ACTIVE" },
            include: { voicePrompt: true },
          },
        },
      },
    },
  });
};
