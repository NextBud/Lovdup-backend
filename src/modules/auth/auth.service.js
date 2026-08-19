import prisma from "../../config/prisma.js";
import * as authDb from "./authDbService.js";
import * as userDb from "../../services/user/userDbService.js";
import { firebaseAuth } from "../../config/firebaseAdmin.js";
import bcrypt from "bcryptjs";
import { signAccessToken } from "../../lib/token.js";
import { generateRefreshToken, hashToken } from "../../lib/sessionTokens.js";
import {
  UnauthorizedException,
  BadRequestError,
} from "../../classes/errorClasses.js";
import { ONBOARDING_STATUS } from "../onboarding/onboarding.constants.js";

// ─────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────

/**
 * Creates an application session and returns LovdUp tokens.
 * Must be called inside a Prisma transaction.
 */
const createSession = async ({ user, tx, meta = {} }) => {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  const session = await authDb.createRefreshSession(
    user.id,
    refreshTokenHash,
    meta,
    tx,
  );

  const accessToken = signAccessToken(user, session.id);

  return {
    accessToken,
    refreshToken,
    sessionId: session.id,
  };
};

/**
 * Builds the authentication response returned to the frontend.
 */
const buildAuthResponse = async ({ user, tokens }) => {
  const onboarding = await authDb.findOnboardingByUserId(user.id);

  return {
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
    },

    onboardingStatus: onboarding?.status ?? ONBOARDING_STATUS.NOT_STARTED,
    ...tokens,
  };
};

// ─────────────────────────────────────────────
// EMAIL AUTH
// ─────────────────────────────────────────────

export const authenticateWithEmail = async ({
  email,
  password,
  meta,
}) => {
  // 1. Find existing user
  let user = await authDb.findUserByEmail(email);

  // 2. Existing user
  if (user) {
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        "This account does not have email authentication enabled.",
      );
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!passwordValid) {
      throw new UnauthorizedException(
        "Invalid email or password.",
      );
    }
  }

  // 3. New user
  if (!user) {
    const passwordHash = await bcrypt.hash(password, 12);

    user = await prisma.$transaction(async (tx) => {
      return authDb.createLocalUserWithOnboarding(
        {
          email,
          passwordHash,
        },
        tx,
      );
    });
  }

  // 4. Account status
  if (user.status !== "ACTIVE") {
    throw new UnauthorizedException(
      "This account is not active.",
    );
  }

  // 5. Update last login
  await authDb.updateLastLogin(user.id);

  // 6. Create application session
  const tokens = await prisma.$transaction(async (tx) =>
    createSession({
      user,
      tx,
      meta,
    }),
  );

  // 7. Return the exact same auth response
  return buildAuthResponse({
    user,
    tokens,
  });
};

// ─────────────────────────────────────────────
// PHONE AUTH
// ─────────────────────────────────────────────

export const authenticateWithPhone = async ({ idToken, meta }) => {
  if (!idToken) {
    throw new BadRequestError("Firebase ID token is required.");
  }

  // 1. Verify Firebase token
  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(idToken);
  } catch {
    throw new UnauthorizedException(
      "Phone verification token is invalid or expired.",
    );
  }

  const { uid, phone_number: phone, email, email_verified } = decoded;

  if (!uid) throw new UnauthorizedException("Invalid Firebase identity.");
  if (!phone)
    throw new UnauthorizedException("A verified phone number is required.");

  // 2. Find existing user by phone
  let user = await authDb.findUserByPhone(phone);

  // 3. Existing user
  if (user) {
    // Link Firebase identity
    await authDb.upsertAuthProvider(user.id, uid);

    // Update email if Firebase provides one and it's different
    if (email && email !== user.email) {
      user = await authDb.updateUserEmail(user.id, email, !!email_verified);
    } else if (email_verified && !user.emailVerified) {
      user = await authDb.updateUserEmailVerified(user.id, true);
    }
  }

  // 4. New user
  if (!user) {
    user = await prisma.$transaction(async (tx) => {
      return await authDb.createUserWithOnboarding(
        {
          phone,
          email,
          emailVerified: !!email_verified,
        },
        uid,
        tx,
      );
    });
  }

  // 5. Account status
  if (user.status !== "ACTIVE") {
    throw new UnauthorizedException("This account is not active.");
  }

  // 6. Update last login
  await authDb.updateLastLogin(user.id);

  // 7. Create session
  const tokens = await prisma.$transaction(async (tx) =>
    createSession({ user, tx, meta }),
  );

  // 8. Return auth response
  return buildAuthResponse({ user, tokens });
};

// ─────────────────────────────────────────────
// GET ME
// ─────────────────────────────────────────────

export const getMe = async ({ userId, sessionId }) => {
  if (!userId || !sessionId) {
    throw new UnauthorizedException("Invalid authentication session.");
  }

  const session = await authDb.findSessionById(sessionId, userId);

  if (!session) {
    throw new UnauthorizedException("Session expired or invalid.");
  }

  const user = await authDb.findUserById(userId, {
    profile: true,
    onboardingProgress: true,
  });

  if (!user) {
    throw new UnauthorizedException("User not found.");
  }

  return {
    user: {
      id: user.id,
      phone: user.phone,
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

  // Find active session by refresh token hash
  const session = await authDb.findActiveSession(refreshTokenHash);
  if (!session) {
    throw new UnauthorizedException(
      "Session is invalid or expired. Please log in again.",
    );
  }

  if (session.user.status !== "ACTIVE") {
    throw new UnauthorizedException("This account is not active.");
  }

  // Generate new tokens
  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashToken(newRefreshToken);

  await authDb.updateSessionToken(session.id, newRefreshTokenHash);

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
  const session = await authDb.findSessionById(sessionId, userId);
  if (!session) {
    return { loggedOut: true };
  }

  await authDb.revokeSession(sessionId);
  return { loggedOut: true };
};

// ─────────────────────────────────────────────
// LOGOUT ALL DEVICES
// ─────────────────────────────────────────────

export const logoutAll = async ({ userId }) => {
  await authDb.revokeAllSessions(userId);
  return { loggedOut: true };
};
