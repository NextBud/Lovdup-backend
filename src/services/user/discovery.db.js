import prisma from "../../config/prisma.js";

const dbClient = (trx) => trx || prisma;

export const findDiscoveryCandidates = async ({
  viewerId,
  preferredGenders = [],
  limit = 2,
  trx = null,
}) => {
  const db = dbClient(trx);

  return db.user.findMany({
    where: {
      id: {
        not: viewerId,
      },
      status: "ACTIVE",
      isActive: true,
      isSuspended: false,
      profile: {
        isNot: null,
        ...(preferredGenders.length > 0
          ? {
              gender: {
                in: preferredGenders,
              },
            }
          : {}),
      },
      candidateMatchResults: {
        none: {
          viewerId,
        },
      },
      receivedMatchRequests: {
        none: {
          senderId: viewerId,
        },
      },
    },
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          birthDate: true,
          gender: true,
          residenceCity: true,
          residenceCountry: true,
          occupation: true,
          languages: true,
          aboutMe: true,
          religion: true,
          drinking: true,
          smoking: true,
          socialLife: true,
          childrenPreference: true,
          personalCommStyle: true,
          personalTuesdayVibe: true,
        },
      },
      profilePhotos: {
        where: {
          status: "ACTIVE",
        },
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        select: {
          id: true,
          url: true,
          position: true,
          isPrimary: true,
        },
      },
      voiceAnswers: {
        where: {
          status: "ACTIVE",
        },
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

export const createMatchResult = async (payload, trx = null) => {
  const db = dbClient(trx);

  return db.matchResult.create({
    data: payload,
  });
};

export const createManyMatchResults = async (payloads, trx = null) => {
  const db = dbClient(trx);

  if (!payloads.length) {
    return { count: 0 };
  }

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
    orderBy: {
      shownAt: "desc",
    },
    take: limit,
    include: {
      candidate: {
        select: {
          id: true,
          profile: true,
          profilePhotos: {
            where: {
              status: "ACTIVE",
            },
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          },
          voiceAnswers: {
            where: {
              status: "ACTIVE",
            },
            include: {
              voicePrompt: true,
            },
          },
        },
      },
    },
  });
};
