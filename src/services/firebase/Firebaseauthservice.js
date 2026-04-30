import admin from "../config/firebaseAdmin.js";
import prisma from "../config/prisma.js";
import * as userDb from "../user/userDbService.js";
import * as walletDb from "../services/wallet/walletDbService.js";
import { signAccessToken } from "../lib/token.js";
import { UnauthorizedException } from "../lib/classes/errorClasses.js";

// ─── Helper ───────────────────────────────────────────────────────────────────

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified,
  verified: user.verified,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
});

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * POST /auth/firebase
 *
 * Called immediately after the user completes Firebase sign-in on the frontend.
 * 1. Verifies the Firebase ID token with Firebase Admin SDK
 * 2. Finds or creates the matching Prisma user
 * 3. Returns your app's own JWT so all subsequent requests use it
 *
 * Supports Google, Apple, and phone auth — Firebase abstracts the difference.
 * The `providerUid` stored is the Firebase UID (stable across sign-ins).
 */
export const firebaseExchange = async (idToken) => {
  // 1. Verify the token with Firebase Admin
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    throw new UnauthorizedException("Invalid Firebase ID token");
  }

  const { uid, email, phone_number: phone, email_verified } = decodedToken;

  // 2. Try to find an existing user by Firebase UID (authProvider record)
  let user = await prisma.authProvider
    .findUnique({
      where: { providerUid: uid },
      include: { user: true },
    })
    .then((ap) => ap?.user ?? null);

  // 3. If no match, find by email or create a new user
  if (!user) {
    if (email) {
      user = await userDb.findUserByEmail(email);
    }

    if (!user) {
      // First time this Firebase identity has been seen — create the user
      user = await prisma.$transaction(async (tx) => {
        const created = await userDb.createUser(
          {
            email: email || null,
            phone: phone || null,
            emailVerified: email_verified ?? false,
            phoneVerified: !!phone,
            // No passwordHash — Firebase users never use password auth on this app
            authProviders: {
              create: {
                provider: "FIREBASE",
                providerUid: uid,
              },
            },
          },
          tx,
        );

        await walletDb.createWallet({ userId: created.id, balance: 0 }, tx);

        return created;
      });
    } else {
      // Existing email-based user — attach the Firebase provider record
      await prisma.authProvider.upsert({
        where: { providerUid: uid },
        update: {},
        create: {
          userId: user.id,
          provider: "FIREBASE",
          providerUid: uid,
        },
      });
    }
  }

  // 4. Guard against suspended / deleted accounts
  if (!user.isActive || user.isSuspended || user.status === "DELETED") {
    throw new UnauthorizedException("Account is not active");
  }

  await userDb.updateLastLogin(user.id);

  return {
    user: sanitizeUser(user),
    token: signAccessToken(user),
  };
};
