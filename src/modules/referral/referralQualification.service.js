import prisma from "../../config/prisma.js";
import { BadRequestError } from "../../classes/errorClasses.js";
import * as referralRepo from "./referral.repository.js";
import * as referralEvents from "./referral.events.js";
import { REFERRAL_STATUS } from "./referral.types.js";

export const qualifyReferral = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
    },
  });

  if (!user) {
    console.log(`User ${userId} not found`);
    return null;
  }

  if (!user.profile || !user.profile.onboardingCompleted) {
    console.log(`User ${userId} has not completed onboarding`);
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const referral = await referralRepo.findReferralByReferredUser(userId, tx);

    if (!referral) {
      console.log(`No referral found for user ${userId}`);
      return null;
    }

    if (referral.status !== REFERRAL_STATUS.PENDING) {
      console.log(`Referral ${referral.id} is already ${referral.status}`);
      return referral;
    }

    const qualified = await referralRepo.updateReferral(
      referral.id,
      {
        status: REFERRAL_STATUS.QUALIFIED,
        qualifiedAt: new Date(),
      },
      tx,
    );

    referralEvents.emitReferralQualified({
      referralId: qualified.id,
      referrerId: qualified.referrerId,
      referredUserId: qualified.referredUserId,
      referralCodeId: qualified.referralCodeId,
      campaignId: qualified.campaignId,
      qualifiedAt: qualified.qualifiedAt,
      timestamp: new Date(),
    });

    return qualified;
  });
};

export const checkReferralEligibility = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
    },
  });

  if (!user) {
    return {
      eligible: false,
      reason: "User not found",
    };
  }

  if (!user.profile || !user.profile.onboardingCompleted) {
    return {
      eligible: false,
      reason: "User has not completed onboarding",
    };
  }

  const referral = await referralRepo.findReferralByReferredUser(userId);

  if (!referral) {
    return {
      eligible: false,
      reason: "No referral found for this user",
    };
  }

  if (referral.status !== REFERRAL_STATUS.PENDING) {
    return {
      eligible: false,
      reason: `Referral is already ${referral.status}`,
    };
  }

  return {
    eligible: true,
    referral,
  };
};
