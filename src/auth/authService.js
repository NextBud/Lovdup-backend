import prisma from "../config/prisma.js";
import * as userDb from "../services/user/userDbService.js";
import * as walletDb from "../services/wallet/walletDbService.js";
import * as onboardingDb from "../services/onboarding/onboardingDbService.js";
import * as profileDb from "../services/profiles/profileDbService.js";
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "../lib/classes/errorClasses.js";
import { comparePassword, hashPassword } from "../lib/password.js";
import { signAccessToken } from "../lib/token.js";

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  whatsappPhone: user.whatsappPhone,
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified,
  verified: user.verified,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
});

export const registerUser = async (payload) => {
  const { email, password, phone, whatsappPhone } = payload;

  const existingUser = await userDb.findUserByEmail(email);

  if (existingUser) {
    throw new ConflictException("Email already exists");
  }

  const passwordHash = await hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await userDb.createUser(
      {
        email,
        passwordHash,
        phone: phone || null,
        whatsappPhone: whatsappPhone || null,
        onboardingStatus: "IN_PROGRESS",
        authProviders: {
          create: {
            provider: "LOCAL",
            providerUid: email,
          },
        },
      },
      tx,
    );

    await walletDb.createWallet(
      {
        userId: user.id,
        balance: 0,
      },
      tx,
    );

    const onboarding = await onboardingDb.upsertProgress(
      user.id,
      {
        currentStep: 1,
        completedSections: ["auth"],
        draftData: {
          email,
          phone: phone || null,
          whatsappPhone: whatsappPhone || null,
        },
        status: "IN_PROGRESS",
      },
      tx,
    );

    return { user, onboarding };
  });

  return {
    user: sanitizeUser(result.user),
    token: signAccessToken(result.user),
    onboarding: result.onboarding,
  };
};

export const loginUser = async ({ email, password }) => {
  const user = await userDb.findUserByEmail(email);

  if (!user || !user.passwordHash) {
    throw new UnauthorizedException("Invalid email or password");
  }

  if (user.status !== "ACTIVE" || !user.isActive || user.isSuspended) {
    throw new UnauthorizedException("Account is not active");
  }

  const isValid = await comparePassword(password, user.passwordHash);

  if (!isValid) {
    throw new UnauthorizedException("Invalid email or password");
  }

  await userDb.updateLastLogin(user.id);

  const [onboarding, profile] = await Promise.all([
    onboardingDb.findProgressByUserId(user.id),
    profileDb.findProfileByUserId(user.id),
  ]);

  return {
    user: sanitizeUser(user),
    token: signAccessToken(user),
    onboarding,
    hasProfile: Boolean(profile),
  };
};

export const getCurrentUser = async (userId) => {
  const user = await userDb.findUserById(userId);

  if (!user) {
    throw new NotFoundException("User not found");
  }

  const [onboarding, profile] = await Promise.all([
    onboardingDb.findProgressByUserId(userId),
    profileDb.findProfileByUserId(userId),
  ]);

  return {
    user: sanitizeUser(user),
    onboarding,
    hasProfile: Boolean(profile),
  };
};
