import prisma from "../../config/prisma.js";
import { hashToken, generateRefreshToken } from "../../lib/sessionTokens.js";
import { signAccessToken } from "../../lib/token.js";
import { UnauthorizedException } from "../../classes/errorClasses.js";

export const refreshSession = async ({ refreshToken }) => {
  const tokenHash = hashToken(refreshToken);

  const session = await prisma.session.findFirst({
    where: {
      refreshTokenHash: tokenHash,
      isRevoked: false,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!session) {
    throw new UnauthorizedException("Invalid session");
  }

  // 🔥 REUSE DETECTION (important security layer)
  if (session.revokedAt) {
    await prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    throw new UnauthorizedException("Session compromised");
  }

  const newRefreshToken = generateRefreshToken();
  const newHash = hashToken(newRefreshToken);

  const updated = await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: newHash,
      rotationCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });

  const accessToken = signAccessToken(session.user, session.id);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    sessionId: updated.id,
  };
};