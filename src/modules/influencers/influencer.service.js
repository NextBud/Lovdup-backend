import prisma from "../../config/prisma.js";
import { NotFoundException } from "../../classes/errorClasses.js";
import * as influencerRepo from "./influencer.repository.js";
import * as earningRepo from "./influencerEarning.repository.js";
import * as referralRepo from "./influencerReferral.repository.js";

export const getInfluencerDashboard = async (userId) => {
  const influencer = await influencerRepo.findInfluencerByUserId(userId);

  if (!influencer) {
    throw new NotFoundException("Influencer profile not found");
  }

  // Get referral code
  const code = await prisma.referralCode.findUnique({
    where: { userId },
  });

  // Get referrals
  const referrals = await referralRepo.findReferralsByInfluencerId(
    influencer.id,
  );

  // Get earnings summary
  const [paidEarnings, pendingEarnings] = await Promise.all([
    earningRepo.aggregateEarningsByInfluencerId(influencer.id, "PAID"),
    earningRepo.aggregateEarningsByInfluencerId(influencer.id, "PENDING"),
  ]);

  const totalReferrals = referrals.length;
  const successfulOnboardings = referrals.filter(
    (r) => r.status === "REWARDED" || r.status === "QUALIFIED",
  ).length;

  return {
    influencer: {
      id: influencer.id,
      brandName: influencer.brandName,
      status: influencer.status,
    },
    referralCode: code?.code || null,
    statistics: {
      totalReferrals,
      successfulOnboardings,
      pendingOnboardings: referrals.filter((r) => r.status === "PENDING")
        .length,
      totalEarned: paidEarnings._sum.commissionAmount || 0,
      pendingEarnings: pendingEarnings._sum.commissionAmount || 0,
    },
    recentReferrals: referrals.slice(0, 10),
  };
};

export const getReferralCode = async (userId) => {
  const code = await prisma.referralCode.findUnique({
    where: { userId },
  });

  if (!code) {
    throw new NotFoundException("Referral code not found");
  }

  return code.code;
};

export const getInfluencerReferrals = async (userId, filters = {}) => {
  const influencer = await influencerRepo.findInfluencerByUserId(userId);

  if (!influencer) {
    throw new NotFoundException("Influencer profile not found");
  }

  const referrals = await referralRepo.findReferralsByInfluencerId(
    influencer.id,
    filters,
  );

  return referrals;
};

export const getInfluencerEarnings = async (userId, filters = {}) => {
  const influencer = await influencerRepo.findInfluencerByUserId(userId);

  if (!influencer) {
    throw new NotFoundException("Influencer profile not found");
  }

  const earnings = await earningRepo.findEarningsByInfluencerId(
    influencer.id,
    filters,
  );

  const summary = await earningRepo.aggregateEarningsByInfluencerId(
    influencer.id,
  );

  return {
    earnings,
    summary: {
      totalPaid: summary._sum.commissionAmount || 0,
      count: earnings.length,
    },
  };
};
