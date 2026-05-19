import crypto from "crypto";

export const generateRefreshToken = () =>
  crypto.randomBytes(64).toString("hex");

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
