/**
 * token.js
 *
 * Signs and verifies JWT access tokens.
 * sessionId is embedded so the protect middleware can verify
 * the session hasn't been revoked without an extra DB call on
 * every request (you can add that check optionally in protect).
 */

import jwt from "jsonwebtoken";

export const signAccessToken = (user, sessionId) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
    },
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
