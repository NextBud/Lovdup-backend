import admin from "../config/firebaseAdmin.js";
import prisma from "../config/prisma.js";
import * as userDb from "../services/user/userDbService.js";
import * as walletDb from "../services/wallet/walletDbService.js";
import { signAccessToken } from "../lib/token.js";
import { UnauthorizedException } from "../classes/errorClasses.js";

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

export const firebaseExchange = async (idToken) => {
  let decoded;

  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    throw new UnauthorizedException("Invalid authentication token");
  }

  const {
    uid,
    email,
    phone_number: phone,
    email_verified: emailVerified,
  } = decoded;

  // STEP 1: resolve identity provider
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

  // STEP 2: fallback resolution by email
  if (!user && email) {
    user = await userDb.findUserByEmail(email);
  }

  // STEP 3: create user if missing
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

      await walletDb.createWallet({ userId: created.id }, tx);

      return created;
    });
  } else {
    // STEP 4: ensure provider linkage exists
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

  // STEP 5: safety checks
  if (user.status !== "ACTIVE") {
    throw new UnauthorizedException("Account disabled");
  }

  await userDb.updateLastLogin(user.id);

  // STEP 6: issue token ONLY
  return {
    user: sanitizeUser(user),
    token: signAccessToken(user),
  };
};
