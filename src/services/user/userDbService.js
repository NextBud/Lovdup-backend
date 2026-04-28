import prisma from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

export const createUser = async (data, tx = null) => {
  const db = dbClient(tx);

  return db.user.create({
    data,
  });
};

export const findUserByEmail = async (email, tx = null) => {
  const db = dbClient(tx);

  return db.user.findUnique({
    where: { email },
  });
};

export const findUserById = async (userId, tx = null) => {
  const db = dbClient(tx);

  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      whatsappPhone: true,
      emailVerified: true,
      phoneVerified: true,
      verified: true,
      role: true,
      status: true,
      isActive: true,
      isSuspended: true,
      lastLoginAt: true,
      lastActiveAt: true,
      createdAt: true,
      updatedAt: true,
      wallet: true,
      profile: true,
    },
  });
};

export const updateUserById = async (userId, data, tx = null) => {
  const db = dbClient(tx);

  return db.user.update({
    where: { id: userId },
    data,
  });
};

export const updateLastLogin = async (userId, tx = null) => {
  const db = dbClient(tx);

  return db.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
    },
  });
};

export const softDeleteUser = async (
  userId,
  { reason = null, additionalNote = null } = {},
  tx = null,
) => {
  const db = dbClient(tx);

  return db.user.update({
    where: { id: userId },
    data: {
      status: "DELETED",
      isActive: false,
      deletedAt: new Date(),
      deletedReason: reason,
      deletedAdditionalNote: additionalNote,
    },
  });
};
