import prisma from "../../config/prisma.js";
import { generateReferralCode } from "./referralCodeGenerator.js";
import {
  BadRequestError,
  NotFoundException,
} from "../../classes/errorClasses.js";
import * as referralRepo from "./referral.repository.js";
import * as referralCodeRepo from "./referralCode.repository.js";
import { REFERRAL_STATUS, REFERRAL_TYPES } from "./referral.types.js";
import * as referralEvents from "./referral.events.js";

export const createReferralCode = async (
  userId,
  prefix = "LOVDUP",
  tx = null,
) => {
  const db = tx || prisma;

  const existing = await referralCodeRepo.findReferralCodeByUserId(userId, db);

  if (existing) {
    return existing;
  }

  // Generate unique code
  let code = generateReferralCode(prefix);
  let attempts = 0;
  let isUnique = false;

  while (!isUnique && attempts < 5) {
    const existingCode = await referralCodeRepo.findReferralCodeByCode(
      code,
      db,
    );
    if (!existingCode) {
      isUnique = true;
    } else {
      code = generateReferralCode(prefix);
      attempts++;
    }
  }

  if (!isUnique) {
    throw new BadRequestError("Unable to generate unique referral code");
  }

  // Create referral code
  const referralCode = await referralCodeRepo.createReferralCode(
    {
      userId,
      code,
      isActive: true,
    },
    db,
  );

  return referralCode;
};

export const validateReferralCode = async (code) => {
  const referralCode = await referralCodeRepo.findReferralCodeByCode(code);

  if (!referralCode) {
    throw new BadRequestError("Invalid referral code");
  }

  if (!referralCode.isActive) {
    throw new BadRequestError("Referral code is inactive");
  }

  if (referralCode.expiresAt && new Date(referralCode.expiresAt) < new Date()) {
    throw new BadRequestError("Referral code has expired");
  }

  return {
    valid: true,
    code: referralCode.code,
    userId: referralCode.userId,
    isInfluencer: referralCode.user.isInfluencer || false,
    referrerName: referralCode.user.profile?.identity
      ? `${referralCode.user.profile.identity.firstName} ${referralCode.user.profile.identity.lastName}`
      : null,
  };
};

export const applyReferralCode = async (data) => {
  const { code, referredUserId, source = "DIRECT_LINK" } = data;

  return prisma.$transaction(async (tx) => {
    // 1. Validate the referral code
    const referralCode = await referralCodeRepo.findReferralCodeByCode(
      code,
      tx,
    );

    if (!referralCode) {
      throw new BadRequestError("Invalid referral code");
    }

    if (!referralCode.isActive) {
      throw new BadRequestError("Referral code is inactive");
    }

    // 2. Check if user already has a referral
    const existingReferral = await referralRepo.findReferralByReferredUser(
      referredUserId,
      tx,
    );

    if (existingReferral) {
      throw new BadRequestError("User already has a referral");
    }

    // 3. Check if user is trying to refer themselves
    if (referralCode.userId === referredUserId) {
      throw new BadRequestError("You cannot refer yourself");
    }

    // 4. Create referral record
    const referral = await referralRepo.createReferral(
      {
        referralCodeId: referralCode.id,
        referrerId: referralCode.userId,
        referredUserId,
        status: REFERRAL_STATUS.PENDING,
        source,
        registeredAt: new Date(),
        // Determine if this is an influencer referral
        campaignId: referralCode.user.isInfluencer
          ? await getActiveCampaign(tx)
          : null,
      },
      tx,
    );

    // 5. Emit event
    referralEvents.emitReferralCreated({
      referralId: referral.id,
      referrerId: referral.referrerId,
      referredUserId: referral.referredUserId,
      referralCode: referralCode.code,
      isInfluencer: referralCode.user.isInfluencer || false,
      timestamp: new Date(),
    });

    return referral;
  });
};

export const getReferralStats = async (userId) => {
  const [total, pending, qualified, rewarded] = await Promise.all([
    referralRepo.countReferralsByReferrer(userId),
    referralRepo.countReferralsByReferrer(userId, REFERRAL_STATUS.PENDING),
    referralRepo.countReferralsByReferrer(userId, REFERRAL_STATUS.QUALIFIED),
    referralRepo.countReferralsByReferrer(userId, REFERRAL_STATUS.REWARDED),
  ]);

  return {
    total,
    pending,
    qualified,
    rewarded,
  };
};

export const getReferralHistory = async (userId, filters = {}) => {
  const referrals = await referralRepo.findReferralsByReferrer(userId, filters);

  return referrals.map((referral) => ({
    id: referral.id,
    referredUser: referral.referredUser,
    status: referral.status,
    reward: referral.reward,
    createdAt: referral.createdAt,
    qualifiedAt: referral.qualifiedAt,
    rewardedAt: referral.rewardedAt,
  }));
};

export const getMyReferral = async (userId) => {
  const [referralCode, stats, recentReferrals] = await Promise.all([
    referralCodeRepo.findReferralCodeByUserId(userId),
    getReferralStats(userId),
    getReferralHistory(userId, { limit: 5 }),
  ]);

  if (!referralCode) {
    return {
      hasCode: false,
      code: null,
      stats: null,
      recentReferrals: [],
    };
  }

  return {
    hasCode: true,
    code: referralCode.code,
    stats,
    recentReferrals: recentReferrals.slice(0, 5),
  };
};

export const registerReferralClick = async (data) => {
  const {
    referralCodeId,
    ipAddress,
    userAgent,
    deviceFingerprint,
    country,
    source,
  } = data;

  return prisma.referralClick.create({
    data: {
      referralCodeId,
      ipAddress,
      userAgent,
      deviceFingerprint,
      country,
      source: source || "DIRECT_LINK",
      clickedAt: new Date(),
    },
  });
};

// Helper function to get active campaign
const getActiveCampaign = async (tx) => {
  const campaign = await tx.campaign.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  return campaign?.id || null;
};
