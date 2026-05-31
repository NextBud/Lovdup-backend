/**
 * auth.service.js
 *
 * Two entry points:
 *   - authenticateWithPassword (email/password, LOGIN or REGISTER mode)
 *   - authenticateWithFirebase  (Google / Apple / Phone via Firebase idToken)
 *
 * On every new user creation (either path):
 *   1. Create the User record
 *   2. Bootstrap an OnboardingProgress row (NOT_STARTED)
 *   3. Create a Session and return tokens
 *
 * Wallet creation is deferred to completeOnboarding.
 * onboardingStep is intentionally excluded from AuthResponse —
 * step position is restored via onboardingHydrationService.hydrate()
 * which reads currentStepId (string) from the draft, not a step number.
 */

import prisma from "../../config/prisma.js";
import * as userDb from "../../services/user/userDbService.js";
import * as onboardingDb from "../onboarding/onboardingDbService.js";
import { firebaseAuth } from "../../config/firebaseAdmin.js"; // ← fixed: was admin default import
import { comparePassword, hashPassword } from "../../lib/password.js";
import { signAccessToken } from "../../lib/token.js";
import { generateRefreshToken, hashToken } from "../../lib/sessionTokens.js";
import {
  UnauthorizedException,
  ConflictException,
  BadRequestError,
} from "../../classes/errorClasses.js";
import {
  ONBOARDING_STATUS,
  CURRENT_DRAFT_VERSION,
} from "../onboarding/onboarding.constants.js";

// ─────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────

/**
 * Creates an AuthSession row and returns signed tokens.
 * Must be called inside a transaction.
 */
const createSession = async ({ user, tx, meta = {} }) => {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  const session = await tx.refreshSession.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ip ?? null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const accessToken = signAccessToken(user, session.id);

  return {
    accessToken,
    refreshToken,
    sessionId: session.id,
  };
};

/**
 * Bootstraps an OnboardingProgress row for a brand new user.
 * Must be called inside a transaction.
 */
const bootstrapNewUser = async ({ userId, tx }) => {
  return tx.onboardingProgress.create({
    data: {
      userId,
      status: ONBOARDING_STATUS.NOT_STARTED,
      currentStep: 1,
      completedSections: [],
      draftData: {},
      draftVersion: CURRENT_DRAFT_VERSION,
    },
  });
};

/**
 * Builds the auth response the frontend receives.
 * Shape must match AuthResponse in auth.types.ts:
 * { user, accessToken, refreshToken, sessionId, onboardingStatus }
 *
 * onboardingStep is intentionally omitted — the frontend restores
 * step position via hydration (string step IDs), not a step number.
 */
const buildAuthResponse = async ({ user, tokens }) => {
  const onboarding = await onboardingDb.findProgressByUserId(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    onboardingStatus: onboarding?.status ?? ONBOARDING_STATUS.NOT_STARTED,
    ...tokens, // accessToken, refreshToken, sessionId
  };
};

// ─────────────────────────────────────────────
// PASSWORD AUTH
// ─────────────────────────────────────────────

export const authenticateWithPassword = async ({
  email,
  password,
  mode,
  meta,
}) => {
  if (!email || !password || !mode) {
    throw new BadRequestError("email, password and mode are required.");
  }

  if (!["LOGIN", "REGISTER"].includes(mode)) {
    throw new BadRequestError("mode must be LOGIN or REGISTER.");
  }

  const existingUser = await userDb.findUserByEmail(email);
  let user = existingUser;

  // ── REGISTER ──────────────────────────────
  if (mode === "REGISTER") {
    if (existingUser) {
      throw new ConflictException("An account with this email already exists.");
    }

    const passwordHash = await hashPassword(password);

    user = await prisma.$transaction(async (tx) => {
      const created = await userDb.createUser(
        {
          email,
          passwordHash,
          authProviders: {
            create: { provider: "LOCAL", providerUid: email },
          },
        },
        tx,
      );

      await bootstrapNewUser({ userId: created.id, tx });

      return created;
    });
  }

  // ── LOGIN ─────────────────────────────────
  if (mode === "LOGIN") {
    if (!user) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        "This account uses social login. Please sign in with Google or Apple.",
      );
    }

    const valid = await comparePassword(password, user.passwordHash);

    if (!valid) {
      throw new UnauthorizedException("Invalid credentials.");
    }
  }

  // ── SHARED ────────────────────────────────
  if (user.status !== "ACTIVE") {
    throw new UnauthorizedException("This account is not active.");
  }

  await userDb.updateLastLogin(user.id);

  const tokens = await prisma.$transaction(async (tx) =>
    createSession({ user, tx, meta }),
  );

  return buildAuthResponse({ user, tokens });
};

// ─────────────────────────────────────────────
// FIREBASE AUTH
// ─────────────────────────────────────────────

export const authenticateWithFirebase = async ({ idToken, meta }) => {
  if (!idToken) {
    throw new BadRequestError("idToken is required.");
  }

  let decoded;

  try {
    // Fixed: was admin.auth().verifyIdToken() — admin is not the default export.
    // firebaseAuth is the pre-instantiated auth singleton from firebaseAdmin.js.
    decoded = await firebaseAuth.verifyIdToken(idToken);
  } catch {
    throw new UnauthorizedException("Firebase token is invalid or expired.");
  }

  const { uid, email, phone_number: phone, email_verified } = decoded;

  // Look up by Firebase UID first (most reliable)
  let user = await prisma.authProvider
    .findUnique({
      where: {
        provider_providerUid: { provider: "FIREBASE", providerUid: uid },
      },
      include: { user: true },
    })
    .then((r) => r?.user ?? null);

  // Fallback to email match (user may have registered with password first)
  if (!user && email) {
    user = await userDb.findUserByEmail(email);
  }

  // ── NEW USER ──────────────────────────────
  if (!user) {
    user = await prisma.$transaction(async (tx) => {
      const created = await userDb.createUser(
        {
          email: email ?? null,
          phone: phone ?? null,
          emailVerified: !!email_verified,
          authProviders: {
            create: { provider: "FIREBASE", providerUid: uid },
          },
        },
        tx,
      );

      await bootstrapNewUser({ userId: created.id, tx });

      return created;
    });
  } else {
    // ── EXISTING USER — ensure provider is linked ──
    await prisma.authProvider.upsert({
      where: {
        provider_providerUid: { provider: "FIREBASE", providerUid: uid },
      },
      update: { userId: user.id },
      create: { userId: user.id, provider: "FIREBASE", providerUid: uid },
    });
  }

  if (user.status !== "ACTIVE") {
    throw new UnauthorizedException("This account has been disabled.");
  }

  await userDb.updateLastLogin(user.id);

  const tokens = await prisma.$transaction(async (tx) =>
    createSession({ user, tx, meta }),
  );

  return buildAuthResponse({ user, tokens });
};

// ─────────────────────────────────────────────
// GET ME
// ─────────────────────────────────────────────

export const getMe = async ({ userId, sessionId }) => {
  const session = await prisma.refreshSession.findFirst({
    where: {
      id: sessionId,
      userId,
      isRevoked: false,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!session) {
    throw new UnauthorizedException("Session expired or invalid.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      profile: true,
      onboardingProgress: true,
    },
  });

  if (!user) {
    throw new UnauthorizedException("User not found.");
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    session: {
      sessionId,
      valid: true,
    },
    onboarding: {
      status: user.onboardingProgress?.status ?? ONBOARDING_STATUS.NOT_STARTED,
      currentStep: user.onboardingProgress?.currentStep ?? 1,
    },
    profile: {
      exists: !!user.profile,
      completionPercent: user.profile?.completionPercent ?? 0,
    },
  };
};
// ─────────────────────────────────────────────
// REFRESH SESSION
// ─────────────────────────────────────────────

export const refreshSession = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new BadRequestError("Refresh token is required.");
  }

  const refreshTokenHash = hashToken(refreshToken);

  const session = await prisma.refreshSession.findFirst({
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

  if (!session) {
    throw new UnauthorizedException(
      "Session is invalid or expired. Please log in again.",
    );
  }

  if (session.user.status !== "ACTIVE") {
    throw new UnauthorizedException("This account is not active.");
  }

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashToken(newRefreshToken);

  await prisma.refreshSession.update({
    where: {
      id: session.id,
    },
    data: {
      refreshTokenHash: newRefreshTokenHash,
      rotationCount: {
        increment: 1,
      },
      lastUsedAt: new Date(),
    },
  });

  const accessToken = signAccessToken(session.user, session.id);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    sessionId: session.id,
  };
};
// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────

export const logout = async ({ userId, sessionId }) => {
  const session = await prisma.refreshSession.findFirst({
    where: {
      id: sessionId,
      userId,
    },
  });

  if (!session) {
    return {
      loggedOut: true,
    };
  }

  await prisma.refreshSession.update({
    where: {
      id: sessionId,
    },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });

  return {
    loggedOut: true,
  };
};

// ─────────────────────────────────────────────
// LOGOUT ALL DEVICES
// ─────────────────────────────────────────────

export const logoutAll = async ({ userId }) => {
  await prisma.refreshSession.updateMany({
    where: {
      userId,
      isRevoked: false,
    },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });

  return {
    loggedOut: true,
  };
};
