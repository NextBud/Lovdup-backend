import prisma from "../../config/prisma.js";

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

export const findUserMatches = async ({ userId, trx = null }) => {
  const db = dbClient(trx);

  return db.match.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    orderBy: {
      matchedAt: "desc",
    },
    include: {
      userA: {
        select: {
          id: true,
          profile: true,
          profilePhotos: {
            where: { status: "ACTIVE" },
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          },
        },
      },
      userB: {
        select: {
          id: true,
          profile: true,
          profilePhotos: {
            where: { status: "ACTIVE" },
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          },
        },
      },
    },
  });
};

export const updateMatchStatus = async ({
  matchId,
  status,
  unmatchedAt = null,
  trx = null,
}) => {
  const db = dbClient(trx);

  return db.match.update({
    where: { id: matchId },
    data: {
      status,
      unmatchedAt,
    },
  });
};
