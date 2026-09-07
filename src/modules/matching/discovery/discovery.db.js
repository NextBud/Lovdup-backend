import prisma from "../../../config/prisma.js";

const dbClient = (trx = null) => trx || prisma;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute birth-date boundaries for an age range.
 *
 * Example:
 * ageMin = 25
 * ageMax = 35
 *
 * Candidate DOB must fall between:
 *
 * today - 35 years
 * and
 * today - 25 years
 */
const birthDateBoundsFromAgeRange = (ageMin, ageMax) => {
  const today = new Date();

  const oldestBirthDate = new Date(today);
  oldestBirthDate.setFullYear(today.getFullYear() - ageMax);

  const youngestBirthDate = new Date(today);
  youngestBirthDate.setFullYear(today.getFullYear() - ageMin);

  return {
    oldestBirthDate,
    youngestBirthDate,
  };
};

// ---------------------------------------------------------------------------
// Discovery candidates
// ---------------------------------------------------------------------------

/**
 * Pull candidates that are eligible for discovery.
 *
 * Discovery DB responsibilities:
 *
 * 1. Exclude the viewer.
 * 2. Exclude inactive/suspended/deleted users.
 * 3. Require completed profiles.
 * 4. Apply preferred gender.
 * 5. Apply preferred age range.
 * 6. Exclude blocked users in either direction.
 * 7. Load only profile data required by compatibility scoring/display.
 *
 * Compatibility scoring itself remains in compatibilityScore.service.js.
 */
export const findDiscoveryCandidates = async ({
  viewerId,
  preferredGenders = [],
  ageMin = 18,
  ageMax = 99,
  limit,
  trx = null,
}) => {
  const db = dbClient(trx);

  const { oldestBirthDate, youngestBirthDate } = birthDateBoundsFromAgeRange(
    ageMin,
    ageMax,
  );

  const genderFilter =
    preferredGenders.length > 0
      ? {
          in: preferredGenders,
        }
      : undefined;

  return db.user.findMany({
    where: {
      // ---------------------------------------------------------------
      // Never return the viewer themselves.
      // ---------------------------------------------------------------

      id: {
        not: viewerId,
      },

      // ---------------------------------------------------------------
      // Account eligibility.
      // ---------------------------------------------------------------

      isActive: true,
      isSuspended: false,
      deletedAt: null,

      status: "ACTIVE",

      // ---------------------------------------------------------------
      // Block filtering.
      //
      // Exclude:
      //
      // viewer -> candidate
      // candidate -> viewer
      //
      // Both directions matter.
      // ---------------------------------------------------------------

      AND: [
        {
          NOT: {
            blocksCreated: {
              some: {
                blockedId: viewerId,
              },
            },
          },
        },
        {
          NOT: {
            blocksReceived: {
              some: {
                blockerId: viewerId,
              },
            },
          },
        },
      ],

      // ---------------------------------------------------------------
      // Candidate profile requirements.
      // ---------------------------------------------------------------

      profile: {
        is: {
          onboardingCompleted: true,

          identity: {
            is: {
              // ---------------------------------------------------------
              // Gender
              // ---------------------------------------------------------

              ...(genderFilter
                ? {
                    gender: genderFilter,
                  }
                : {}),

              // ---------------------------------------------------------
              // Age
              // ---------------------------------------------------------

              birthDate: {
                gte: oldestBirthDate,
                lte: youngestBirthDate,
              },
            },
          },
        },
      },
    },

    include: {
      // -----------------------------------------------------------------
      // Candidate profile
      // -----------------------------------------------------------------

      profile: {
        include: {
          identity: true,
          lifestyle: true,
          values: true,
          narrative: true,
        },
      },

      // -----------------------------------------------------------------
      // Photos
      // -----------------------------------------------------------------

      profilePhotos: {
        where: {
          status: "ACTIVE",
          moderationStatus: "APPROVED",
        },

        orderBy: {
          position: "asc",
        },
      },

      // // ✅ ADDED: Voice answers for candidate
      // voiceAnswers: {
      //   where: {
      //     status: "ACTIVE",
      //     moderationStatus: "APPROVED",
      //   },
      //   include: {
      //     voicePrompt: true,
      //   },
      //   orderBy: {
      //     createdAt: "asc",
      //   },
      // },
    },

    orderBy: {
      lastActiveAt: "desc",
    },

    take: limit,
  });
};

// ---------------------------------------------------------------------------
// Match results
// ---------------------------------------------------------------------------

export const createManyMatchResults = async (payload, trx = null) => {
  const db = dbClient(trx);

  return db.matchResult.createMany({
    data: payload,
  });
};

export const findViewerMatchResults = async ({
  viewerId,
  limit,
  trx = null,
}) => {
  const db = dbClient(trx);

  return db.matchResult.findMany({
    where: {
      viewerId,
    },

    include: {
      candidate: {
        include: {
          profile: {
            include: {
              identity: true,
              lifestyle: true,
              values: true,
              narrative: true,
            },
          },

          profilePhotos: {
            where: {
              status: "ACTIVE",
              moderationStatus: "APPROVED",
            },

            orderBy: {
              position: "asc",
            },
          },

          // ✅ ADDED: Voice answers for candidate
          // voiceAnswers: {
          //   where: {
          //     status: "ACTIVE",
          //     moderationStatus: "APPROVED",
          //   },
          //   include: {
          //     voicePrompt: true,
          //   },
          //   orderBy: {
          //     createdAt: "asc",
          //   },
          // },
        },
      },
    },

    orderBy: {
      rank: "asc",
    },

    take: limit,
  });
};
