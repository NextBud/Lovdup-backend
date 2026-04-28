import prisma from "../config/prisma.js";
import * as userDb from "../user/userDbService.js";
import * as walletDb from "../services/wallet/walletDbService.js";
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

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await userDb.createUser(
      {
        email,
        passwordHash,
        phone: phone || null,
        whatsappPhone: whatsappPhone || null,
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
        userId: createdUser.id,
        balance: 0,
      },
      tx,
    );

    return createdUser;
  });

  return {
    user: sanitizeUser(user),
    token: signAccessToken(user),
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

  return {
    user: sanitizeUser(user),
    token: signAccessToken(user),
  };
};

export const getCurrentUser = async (userId) => {
  const user = await userDb.findUserById(userId);

  if (!user) {
    throw new NotFoundException("User not found");
  }

  return user;
};
