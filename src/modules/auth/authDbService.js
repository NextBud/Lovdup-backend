// authDbService.js
import prisma from "../../config/prisma.js";

const db = (tx) => tx ?? prisma;

// ─────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────

export const findUserByPhone = async (phone, tx = null) => {
  return db(tx).user.findUnique({
    where: { phone },
  });
};

export const findUserByEmail = async (email, tx = null) => {
  return db(tx).user.findUnique({
    where: { email },
  });
};

export const findUserById = async (userId, include = {}, tx = null) => {
  return db(tx).user.findUnique({
    where: { id: userId },
    include,
  });
};

export const updateUserEmail = async (
  userId,
  email,
  emailVerified = false,
  tx = null,
) => {
  return db(tx).user.update({
    where: { id: userId },
    data: {
      email,
      emailVerified,
    },
  });
};

export const updateUserEmailVerified = async (
  userId,
  emailVerified,
  tx = null,
) => {
  return db(tx).user.update({
    where: { id: userId },
    data: {
      emailVerified,
    },
  });
};

export const updateLastLogin = async (userId, tx = null) => {
  return db(tx).user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
    },
  });
};

// ─────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────

export const findOnboardingByUserId = async (userId, tx = null) => {
  return db(tx).onboardingProgress.findUnique({
    where: { userId },
  });
};

export const createOnboardingProgress = async (userId, tx = null) => {
  return db(tx).onboardingProgress.create({
    data: {
      userId,
      status: "NOT_STARTED",
      currentStep: 1,
      maxReachedStep: 1,
      completedSections: [],
      draftData: {},
      draftVersion: 1,
    },
  });
};

// ─────────────────────────────────────────────
// AUTH PROVIDER
// ─────────────────────────────────────────────

export const upsertLocalAuthProvider = async (userId, tx = null) => {
  return db(tx).authProvider.upsert({
    where: {
      provider_providerUid: {
        provider: "LOCAL",
        providerUid: userId,
      },
    },
    update: {
      userId,
    },
    create: {
      userId,
      provider: "LOCAL",
      providerUid: userId,
    },
  });
};

// ─────────────────────────────────────────────
// SESSIONS
// ─────────────────────────────────────────────

export const createRefreshSession = async (
  userId,
  refreshTokenHash,
  meta = {},
  tx = null,
) => {
  return db(tx).refreshSession.create({
    data: {
      userId,
      refreshTokenHash,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ip ?? null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
};

export const findActiveSession = async (refreshTokenHash, tx = null) => {
  return db(tx).refreshSession.findFirst({
    where: {
      refreshTokenHash,
      isRevoked: false,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });
};

export const findSessionById = async (sessionId, userId = null, tx = null) => {
  const where = {
    id: sessionId,
  };

  if (userId) {
    where.userId = userId;
  }

  return db(tx).refreshSession.findFirst({
    where: {
      ...where,
      isRevoked: false,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });
};

export const updateSessionToken = async (
  sessionId,
  newRefreshTokenHash,
  tx = null,
) => {
  return db(tx).refreshSession.update({
    where: {
      id: sessionId,
    },
    data: {
      refreshTokenHash: newRefreshTokenHash,
      rotationCount: {
        increment: 1,
      },
      lastUsedAt: new Date(),
    },
  });
};

export const revokeSession = async (sessionId, tx = null) => {
  return db(tx).refreshSession.update({
    where: {
      id: sessionId,
    },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });
};

export const revokeAllSessions = async (userId, tx = null) => {
  return db(tx).refreshSession.updateMany({
    where: {
      userId,
      isRevoked: false,
    },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });
};

// ─────────────────────────────────────────────
// NEW USER BOOTSTRAP
// ─────────────────────────────────────────────

/**
 * Creates:
 *
 * User
 * ├── Firebase AuthProvider
 * └── OnboardingProgress
 *
 * Everything happens inside the caller's transaction.
 */
export const createLocalUserWithOnboarding = async (
  { email, passwordHash },
  tx = null,
) => {
  return db(tx).user.create({
    data: {
      email,
      passwordHash,
      emailVerified: false,

      authProviders: {
        create: {
          provider: "LOCAL",
          providerUid: email,
        },
      },

      onboardingProgress: {
        create: {
          status: "NOT_STARTED",
          currentStep: 1,
          maxReachedStep: 1,
          completedSections: [],
          draftData: {},
          draftVersion: 1,
        },
      },
    },
  });
};