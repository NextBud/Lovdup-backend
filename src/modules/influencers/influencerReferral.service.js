import * as referralRepo from "./influencerReferral.repository.js";
import * as influencerRepo from "./influencer.repository.js";
import { BadRequestError } from "../../classes/errorClasses.js";

export const createInfluencerReferral = async (data, tx = null) => {
  const db = tx || prisma;

  const { referralCode, referredUserId } = data;

  // 1. Find the referral code
  const code = await db.referralCode.findUnique({
    where: { code: referralCode },
    include: {
      user: {
        include: {
          influencerProfile: true,
        },
      },
    },
  });

  if (!code) {
    throw new BadRequestError("Invalid referral code");
  }

  // 2. Check if user has an influencer profile
  if (!code.user.influencerProfile) {
    throw new BadRequestError("This code is not from an influencer");
  }

  // 3. Check if referral already exists
  const existingReferral = await referralRepo.findReferralByUserId(
    referredUserId,
    db,
  );

  if (existingReferral) {
    return existingReferral;
  }

  // 4. Create influencer referral
  const referral = await referralRepo.createReferral(
    {
      influencerId: code.user.influencerProfile.id,
      referredUserId,
      referralCode: code.code,
      status: "PENDING",
      registeredAt: new Date(),
    },
    db,
  );

  return referral;
};

export const qualifyInfluencerReferral = async (userId, tx = null) => {
  const db = tx || prisma;

  const referral = await referralRepo.findReferralByUserId(userId, db);

  if (!referral) {
    return null;
  }

  if (referral.status !== "PENDING") {
    return referral;
  }

  const updated = await referralRepo.updateReferralStatus(
    referral.id,
    "QUALIFIED",
    db,
  );

  return updated;
};

export const getInfluencerReferralStats = async (influencerId, tx = null) => {
  const db = tx || prisma;

  const [total, qualified, pending, rewarded] = await Promise.all([
    referralRepo.countReferralsByInfluencerId(influencerId, null, db),
    referralRepo.countReferralsByInfluencerId(influencerId, "QUALIFIED", db),
    referralRepo.countReferralsByInfluencerId(influencerId, "PENDING", db),
    referralRepo.countReferralsByInfluencerId(influencerId, "REWARDED", db),
  ]);

  return {
    total,
    qualified,
    pending,
    rewarded,
  };
};
