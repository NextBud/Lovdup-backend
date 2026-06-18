// authMiddleware.js
import { verifyAccessToken } from "../lib/token.js";
import { UnauthorizedException } from "../classes/errorClasses.js";
import asyncWrapper from "../lib/asyncWrapper.js";

export const authMiddleware = asyncWrapper(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedException("No token provided.");
  }

  const token = authHeader.split(" ")[1];

  let decoded;

  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new UnauthorizedException(
        "Token expired. Please refresh your session.",
      );
    }
    throw new UnauthorizedException("Invalid token.");
  }

  // ✅ Set both for compatibility
  req.user = {
    id: decoded.userId, // ✅ Add id for compatibility
    userId: decoded.userId, // ✅ Keep userId for existing code
    email: decoded.email,
    role: decoded.role,
    sessionId: decoded.sessionId,
  };

  next();
});

export const requireRole = (...roles) =>
  asyncWrapper(async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new UnauthorizedException("You do not have permission to do this.");
    }
    next();
  });
