import prisma from "../../../config/prisma.js";

const dbClient = (trx = null) => trx || prisma;

/**
 * Compute birth-date boundaries for the requested age range.
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

/**
 * Pull candidates for discovery matching.
 */
export const findDiscoveryCandidates = async ({
  viewerId,
  preferredGenders,
  ageMin,
  ageMax,
  limit,
  trx = null,
}) => {
  const db = dbClient(trx);

  const { oldestBirthDate, youngestBirthDate } = birthDateBoundsFromAgeRange(
    ageMin,
    ageMax,
  );

  return db.user.findMany({
    where: {
      id: {
        not: viewerId,
      },

      // Add the rest of your filters here.
      // They all execute through `db`, therefore through `trx`
      // when this function is called inside a transaction.

      profile: {
        is: {
          identity: {
            is: {
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
        },
        orderBy: {
          position: "asc",
        },
      },

      voiceAnswers: {
        where: {
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          voicePrompt: true,
        },
      },
    },

    take: limit,
  });
};

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
            },
            orderBy: {
              position: "asc",
            },
          },

          voiceAnswers: {
            where: {
              status: "ACTIVE",
            },
            orderBy: {
              createdAt: "asc",
            },
            include: {
              voicePrompt: true,
            },
          },
        },
      },
    },

    orderBy: {
      rank: "asc",
    },

    take: limit,
  });
};
