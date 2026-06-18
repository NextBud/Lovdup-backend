import prisma from "../../config/prisma.js";

const dbClient = (trx) => trx || prisma;

export const create = async ({ blockerId, blockedId, reason }, trx = null) => {
  return dbClient(trx).userBlock.create({
    data: {
      blockerId,
      blockedId,
      reason,
    },
  });
};

export const remove = async (blockerId, blockedId, trx = null) => {
  return dbClient(trx).userBlock.delete({
    where: {
      blockerId_blockedId: {
        blockerId,
        blockedId,
      },
    },
  });
};

export const findByUsers = async (blockerId, blockedId, trx = null) => {
  return dbClient(trx).userBlock.findUnique({
    where: {
      blockerId_blockedId: {
        blockerId,
        blockedId,
      },
    },
  });
};

export const findBetweenUsers = async (userAId, userBId, trx = null) => {
  return dbClient(trx).userBlock.findFirst({
    where: {
      OR: [
        {
          blockerId: userAId,
          blockedId: userBId,
        },
        {
          blockerId: userBId,
          blockedId: userAId,
        },
      ],
    },
  });
};

export const existsBetweenUsers = async (userAId, userBId, trx = null) => {
  const block = await dbClient(trx).userBlock.findFirst({
    where: {
      OR: [
        {
          blockerId: userAId,
          blockedId: userBId,
        },
        {
          blockerId: userBId,
          blockedId: userAId,
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return Boolean(block);
};
