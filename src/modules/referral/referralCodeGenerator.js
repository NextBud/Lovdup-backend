import crypto from "crypto";

export const generateReferralCode = (prefix = "LOVDUP") => {
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${code}`;
};

export const generateInfluencerReferralCode = (brandName) => {
  const cleanBrand = brandName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);

  const random = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${cleanBrand}-${random}`;
};
