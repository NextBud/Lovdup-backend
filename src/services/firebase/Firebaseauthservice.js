import { firebaseAuth } from "../config/firebaseAdmin.js";
import prisma from "../config/prisma.js";
import * as userDb from "../services/user/userDbService.js";
import * as walletDb from "../services/wallet/walletDbService.js";
import { signAccessToken, signRefreshToken } from "../lib/token.js";
import { UnauthorizedException } from "../classes/errorClasses.js";

// ─────────────────────────────────────────────
// SANITIZE
// Shapes the user object returned to the frontend.
// Must match the AuthResponse type in auth.types.ts:
// { user, accessToken, refreshToken, onboardingStatus }
// ─────────────────────────────────────────────
const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
});

// ─────────────────────────────────────────────
// RESOLVE ONBOARDING STATUS
// Reads from the user's onboarding record if it exists.
// Falls back to NOT_STARTED so the frontend always gets a valid value.
// ─────────────────────────────────────────────
const resolveOnboardingStatus = async (userId) => {
  const onboarding = await prisma.onboarding.findUnique({
    where: { userId },
    select: { status: true },
  });

  return onboarding?.status ?? "NOT_STARTED";
};

// ─────────────────────────────────────────────
// FIREBASE EXCHANGE
// Verifies a Firebase ID token and returns a session.
// ─────────────────────────────────────────────
export const firebaseExchange = async (idToken) => {
  // STEP 1: verify Firebase token
  // Uses the exported firebaseAuth instance — never admin.auth() directly.
  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(idToken);
  } catch {
    throw new UnauthorizedException("Invalid authentication token");
  }

  const {
    uid,
    email,
    phone_number: phone,
    email_verified: emailVerified,
  } = decoded;

  // STEP 2: resolve identity provider
  const provider = await prisma.authProvider.findUnique({
    where: {
      provider_providerUid: {
        provider: "FIREBASE",
        providerUid: uid,
      },
    },
    include: { user: true },
  });

  let user = provider?.user || null;

  // STEP 3: fallback resolution by email
  if (!user && email) {
    user = await userDb.findUserByEmail(email);
  }

  // STEP 4: create user if missing
  if (!user) {
    user = await prisma.$transaction(async (tx) => {
      const created = await userDb.createUser(
        {
          email: email || null,
          phone: phone || null,
          emailVerified: !!emailVerified,
          phoneVerified: !!phone,
          authProviders: {
            create: {
              provider: "FIREBASE",
              providerUid: uid,
            },
          },
        },
        tx,
      );

      // walletDb.createWallet must accept tx as second arg to stay
      // inside the transaction boundary. Verify this in walletDbService.js.
      await walletDb.createWallet({ userId: created.id }, tx);

      return created;
    });
  } else {
    // STEP 5: ensure provider linkage exists for returning users
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

  // STEP 6: safety check
  if (user.status !== "ACTIVE") {
    throw new UnauthorizedException("Account disabled");
  }

  await userDb.updateLastLogin(user.id);

  // STEP 7: resolve onboarding status for the frontend guard
  const onboardingStatus = await resolveOnboardingStatus(user.id);

  // STEP 8: issue tokens
  // Response shape must match AuthResponse in auth.types.ts:
  // { user, accessToken, refreshToken, onboardingStatus }
  return {
    user: sanitizeUser(user),
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
    onboardingStatus,
  };
};
