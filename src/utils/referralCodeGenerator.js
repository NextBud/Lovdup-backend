import crypto from "crypto";

export const generateReferralCode = (prefix = "LOVE") => {
  const code = crypto.randomBytes(4).toString("hex").toUpperCase();

  return `${prefix}-${code}`;
};
