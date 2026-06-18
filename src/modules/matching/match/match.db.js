import prisma from "../../../config/prisma.js";

const dbClient = (trx) => trx || prisma;

export const findMatchBetweenUsers = async ({
  userAId,
  userBId,
  trx = null,
}) => {
  const db = dbClient(trx);

  return db.match.findUnique({
    where: {
      userAId_userBId: {
        userAId,
        userBId,
      },
    },
  });
};

export const createMatch = async ({ userAId, userBId, trx = null }) => {
  const db = dbClient(trx);

  return db.match.create({
    data: {
      userAId,
      userBId,
    },
  });
};

// match.db.js - Update findById to include full relations
export const findById = async (matchId, trx = null) => {
  const db = dbClient(trx);

  return db.match.findUnique({
    where: { id: matchId },
    include: {
      userA: {
        include: {
          profile: {
            include: {
              identity: true,
              lifestyle: true,
              values: true,
              narrative: true,
            }
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
      userB: {
        include: {
          profile: {
            include: {
              identity: true,
              lifestyle: true,
              values: true,
              narrative: true,
            }
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
      conversation: {
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          lastMessage: true,
        },
      },
      compatibilityScore: true,
    },
  });
};

export const findUserMatches = async ({ 
  userId, 
  status = "ACTIVE", 
  limit = 50, 
  offset = 0,
  trx = null 
}) => {
  const db = dbClient(trx);

  return db.match.findMany({
    where: {
      ...(status && { status }),
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    orderBy: {
      matchedAt: "desc",
    },
    skip: offset,
    take: limit,
    include: {
      userA: {
        include: {
          profile: {
            include: {
              identity: true,
              lifestyle: true,
              values: true,
              narrative: true,
            }
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
      userB: {
        include: {
          profile: {
            include: {
              identity: true,
              lifestyle: true,
              values: true,
              narrative: true,
            }
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
      conversation: {
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          lastMessage: true,
        },
      },
      compatibilityScore: true,
    },
  });
};

export const createBlock = async ({ blockerId, blockedId, reason = null, trx = null }) => {
  const db = dbClient(trx);

  return db.userBlock.create({
    data: {
      blockerId,
      blockedId,
      reason,
    },
  });
};

export const createMatchIfNotExists = async (
  { userAId, userBId },
  trx = null,
) => {
  const db = dbClient(trx);

  return db.match.upsert({
    where: {
      userAId_userBId: {
        userAId,
        userBId,
      },
    },
    update: {
      status: "ACTIVE",
      unmatchedAt: null,
    },
    create: {
      userAId,
      userBId,
      status: "ACTIVE",
    },
  });
};

export const getUserMatchStats = async (userId, trx = null) => {
  const db = dbClient(trx);

  const [total, active, unmatched, blocked, thisMonth, thisWeek] = await Promise.all([
    db.match.count({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    }),
    db.match.count({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: "ACTIVE",
      },
    }),
    db.match.count({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: "UNMATCHED",
      },
    }),
    db.match.count({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: "BLOCKED",
      },
    }),
    db.match.count({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        matchedAt: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        },
      },
    }),
    db.match.count({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        matchedAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7)),
        },
      },
    }),
  ]);

  return {
    total,
    active,
    unmatched,
    blocked,
    matchesThisMonth: thisMonth,
    matchesThisWeek: thisWeek,
    averageDuration: null, // Calculate if needed
  };
};

export const updateMatchStatus = async ({
  matchId,
  status,
  unmatchedAt = null,
  unmatchedBy = null,
  unmatchedReason = null,
  trx = null,
}) => {
  const db = dbClient(trx);

  return db.match.update({
    where: { id: matchId },
    data: {
      status,
      unmatchedAt,
      // Add metadata fields if you add them to schema
      // unmatchedBy,
      // unmatchedReason,
    },
  });
};
