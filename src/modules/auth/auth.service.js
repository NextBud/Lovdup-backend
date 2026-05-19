/**
 * auth.service.js
 *
 * All authentication business logic lives here.
 * Two entry points:
 *   - authenticateWithPassword (email/password, LOGIN or REGISTER mode)
 *   - authenticateWithFirebase  (Google / Apple / Phone via Firebase idToken)
 *
 * On every new user creation (either path), we:
 *   1. Create the User record
 *   2. Bootstrap an OnboardingProgress row (NOT_STARTED)
 *   3. Create a Session and return tokens
 *
 * Wallet creation is intentionally deferred to completeOnboarding.
 * A wallet for an incomplete profile serves no purpose.
 */

import prisma from "../../config/prisma.js";
import * as userDb from "../../services/user/userDbService.js";
import * as onboardingDb from "../../services/onboarding/onboardingDbService.js";
import admin from "../../config/firebaseAdmin.js";
import { comparePassword, hashPassword } from "../../lib/password.js";
import { signAccessToken } from "../../lib/token.js";
import { generateRefreshToken, hashToken } from "../../lib/sessionTokens.js";
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "../../lib/classes/errorClasses.js";
import {
  ONBOARDING_STATUS,
  CURRENT_DRAFT_VERSION,
} from "../../services/onboarding/onboarding.constants.js";

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

  const session = await tx.authSession.create({
    data: {
      userId: user.id,
      refreshToken: refreshTokenHash, // stored as hash, never raw
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ip ?? null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  // sessionId embedded in token so we can revoke individual sessions
  const accessToken = signAccessToken(user, session.id);

  return {
    accessToken,
    refreshToken, // raw token returned to client, hash stays in DB
    sessionId: session.id,
  };
};

/**
 * Creates the OnboardingProgress row for a brand new user.
 * Status starts as NOT_STARTED — the user hasn't touched step 1 yet.
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
 * Shapes the auth response the frontend receives.
 * Includes onboardingStatus so the app knows where to route the user.
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
    onboardingStep: onboarding?.currentStep ?? 1,
    ...tokens,
  };
};

// ─────────────────────────────────────────────
// PASSWORD AUTH  (email + password)
// ─────────────────────────────────────────────

export const authenticateWithPassword = async ({
  email,
  password,
  mode,
  meta,
}) => {
  if (!email || !password || !mode) {
    throw new BadRequestException("email, password and mode are required.");
  }

  if (!["LOGIN", "REGISTER"].includes(mode)) {
    throw new BadRequestException("mode must be LOGIN or REGISTER.");
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
            create: {
              provider: "LOCAL",
              providerUid: email,
            },
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
      // Account exists but was created via social — no password set
      throw new UnauthorizedException(
        "This account uses social login. Please sign in with Google or Apple.",
      );
    }

    const valid = await comparePassword(password, user.passwordHash);

    if (!valid) {
      throw new UnauthorizedException("Invalid credentials.");
    }
  }

  // ── SHARED (both modes) ───────────────────
  if (user.status !== "ACTIVE") {
    throw new UnauthorizedException("This account is not active.");
  }

  await userDb.updateLastLogin(user.id);

  const tokens = await prisma.$transaction(async (tx) => {
    return createSession({ user, tx, meta });
  });

  return buildAuthResponse({ user, tokens });
};

// ─────────────────────────────────────────────
// FIREBASE AUTH  (Google / Apple / Phone)
// ─────────────────────────────────────────────

export const authenticateWithFirebase = async ({ idToken, meta }) => {
  if (!idToken) {
    throw new BadRequestException("idToken is required.");
  }

  let decoded;

  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    throw new UnauthorizedException("Firebase token is invalid or expired.");
  }

  const { uid, email, phone_number: phone, email_verified } = decoded;

  // Look up by Firebase UID first (most reliable)
  let user = await prisma.authProvider
    .findUnique({
      where: {
        provider_providerUid: {
          provider: "FIREBASE",
          providerUid: uid,
        },
      },
      include: { user: true },
    })
    .then((r) => r?.user ?? null);

  // Fall back to email match (user may have registered with password first)
  if (!user && email) {
    user = await userDb.findUserByEmail(email);
  }

  // ── NEW USER via Firebase ──────────────────
  if (!user) {
    user = await prisma.$transaction(async (tx) => {
      const created = await userDb.createUser(
        {
          email: email ?? null,
          phone: phone ?? null,
          emailVerified: !!email_verified,
          authProviders: {
            create: {
              provider: "FIREBASE",
              providerUid: uid,
            },
          },
        },
        tx,
      );

      await bootstrapNewUser({ userId: created.id, tx });

      return created;
    });
  } else {
    // ── EXISTING USER — link Firebase provider if not already linked ──
    await prisma.authProvider.upsert({
      where: {
        provider_providerUid: {
          provider: "FIREBASE",
          providerUid: uid,
        },
      },
      update: { userId: user.id },
      create: {
        userId: user.id,
        provider: "FIREBASE",
        providerUid: uid,
      },
    });
  }

  if (user.status !== "ACTIVE") {
    throw new UnauthorizedException("This account has been disabled.");
  }

  await userDb.updateLastLogin(user.id);

  const tokens = await prisma.$transaction(async (tx) => {
    return createSession({ user, tx, meta });
  });

  return buildAuthResponse({ user, tokens });
};

// ─────────────────────────────────────────────
// REFRESH SESSION
// ─────────────────────────────────────────────

export const refreshSession = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new BadRequestException("Refresh token is required.");
  }

  const tokenHash = hashToken(refreshToken);

  const session = await prisma.authSession.findFirst({
    where: {
      refreshToken: tokenHash,
      revokedAt: null, // not revoked
      expiresAt: { gt: new Date() }, // not expired
    },
    include: { user: true },
  });

  if (!session) {
    throw new UnauthorizedException(
      "Session is invalid or expired. Please log in again.",
    );
  }

  if (session.user.status !== "ACTIVE") {
    throw new UnauthorizedException("This account is not active.");
  }

  // Rotate refresh token (old one is replaced, never reusable)
  const newRefreshToken = generateRefreshToken();
  const newHash = hashToken(newRefreshToken);

  await prisma.authSession.update({
    where: { id: session.id },
    data: {
      refreshToken: newHash,
      updatedAt: new Date(),
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
  // Revoke only the current session (not all devices)
  const session = await prisma.authSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    // Already gone — treat as success, don't leak info
    return { loggedOut: true };
  }

  await prisma.authSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });

  return { loggedOut: true };
};

// ─────────────────────────────────────────────
// LOGOUT ALL DEVICES
// ─────────────────────────────────────────────

export const logoutAll = async ({ userId }) => {
  await prisma.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { loggedOut: true };
};
