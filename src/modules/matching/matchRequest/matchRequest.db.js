import prisma from "../../config/prisma.js";

const dbClient = (trx) => trx || prisma;

export const findUserById = async (userId, trx = null) => {
  const db = dbClient(trx);

  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      isActive: true,
      isSuspended: true,
      profile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
};

export const findRequestBetweenUsers = async ({
  senderId,
  receiverId,
  trx = null,
}) => {
  const db = dbClient(trx);

  return db.matchRequest.findUnique({
    where: {
      senderId_receiverId: {
        senderId,
        receiverId,
      },
    },
  });
};

export const createRequest = async (payload, trx = null) => {
  const db = dbClient(trx);

  return db.matchRequest.create({
    data: payload,
  });
};

export const findById = async (requestId, trx = null) => {
  const db = dbClient(trx);

  return db.matchRequest.findUnique({
    where: { id: requestId },
    include: {
      sender: {
        select: {
          id: true,
          profile: true,
          profilePhotos: {
            where: { status: "ACTIVE" },
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          },
        },
      },
      receiver: {
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

export const updateStatus = async ({
  requestId,
  status,
  respondedAt = new Date(),
  trx = null,
}) => {
  const db = dbClient(trx);

  return db.matchRequest.update({
    where: { id: requestId },
    data: {
      status,
      respondedAt,
    },
  });
};

export const findSentRequests = async ({ userId, trx = null }) => {
  const db = dbClient(trx);

  return db.matchRequest.findMany({
    where: { senderId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      receiver: {
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

export const findReceivedRequests = async ({ userId, trx = null }) => {
  const db = dbClient(trx);

  return db.matchRequest.findMany({
    where: { receiverId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
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
