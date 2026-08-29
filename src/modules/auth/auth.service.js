import prisma from "../../config/prisma.js";
import * as authDb from "./authDbService.js";
import { firebaseAuth } from "../../config/firebaseAdmin.js";
import bcrypt from "bcryptjs";
import { signAccessToken } from "../../lib/token.js";
import { generateRefreshToken, hashToken } from "../../lib/sessionTokens.js";
import { normalizePhoneNumber } from "../../utils/phone.util.js";
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
// PHONE AUTH
// ─────────────────────────────────────────────

export const authenticateWithPhone = async ({
  idToken,
  meta,
}) => {
  if (!idToken) {
    throw new BadRequestError(
      "Firebase ID token is required.",
    );
  }

  // 1. Verify Firebase token
  let decodedToken;

  try {
    decodedToken = await firebaseAuth.verifyIdToken(idToken);
  } catch {
    throw new UnauthorizedException(
      "Invalid or expired phone authentication token.",
    );
  }

  const firebaseUid = decodedToken.uid;
  const firebasePhone = decodedToken.phone_number;

  if (!firebaseUid || !firebasePhone) {
    throw new UnauthorizedException(
      "Invalid Firebase phone authentication.",
    );
  }

  // 2. Normalize Firebase phone number to E.164
  const normalizedPhone =
    normalizePhoneNumber(firebasePhone);

  if (!normalizedPhone) {
    throw new BadRequestError(
      "The authenticated phone number is invalid.",
    );
  }

  // 3. Resolve the LovdUp user
  const user = await prisma.$transaction(async (tx) => {
    // First: does this Firebase identity already exist?
    const existingProvider =
      await authDb.findAuthProvider(
        "FIREBASE",
        firebaseUid,
        tx,
      );

    if (existingProvider) {
      return existingProvider.user;
    }

    // Second: does this phone already belong to a user?
    let existingUser = await authDb.findUserByPhone(
      normalizedPhone,
      tx,
    );

    // Third: create a new user if necessary
    if (!existingUser) {
      existingUser =
        await authDb.createPhoneUserWithOnboarding(
          {
            phone: normalizedPhone,
            providerUid: firebaseUid,
          },
          tx,
        );

      return existingUser;
    }

    // Existing phone user but Firebase provider isn't linked yet.
    await authDb.createAuthProvider(
      {
        userId: existingUser.id,
        provider: "FIREBASE",
        providerUid: firebaseUid,
      },
      tx,
    );

    // Make sure the phone is marked verified.
    if (
      existingUser.phone !== normalizedPhone ||
      !existingUser.phoneVerified ||
      !existingUser.verified
    ) {
      existingUser = await authDb.updateUserPhone(
        existingUser.id,
        normalizedPhone,
        tx,
      );
    }

    return existingUser;
  });

  // 4. Account status
  if (user.status !== "ACTIVE") {
    throw new UnauthorizedException(
      "This account is not active.",
    );
  }

  // 5. Update last login
  await authDb.updateLastLogin(user.id);

  // 6. Create LovdUp session
  const tokens = await prisma.$transaction(async (tx) =>
    createSession({
      user,
      tx,
      meta,
    }),
  );

  // 7. Same response shape as email authentication
  return buildAuthResponse({
    user,
    tokens,
  });
};

// ─────────────────────────────────────────────
// EMAIL AUTH
// ─────────────────────────────────────────────

export const authenticateWithEmail = async ({
  email,
  password,
  meta,
}) => {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Find existing user
  let user = await authDb.findUserByEmail(normalizedEmail);

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
          email: normalizedEmail,
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

  // 7. Return the same auth response
  return buildAuthResponse({
    user,
    tokens,
  });
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
