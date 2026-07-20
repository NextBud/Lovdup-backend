import prisma from "../../config/prisma.js";
import * as referralRepo from "./referral.repository.js";
import * as rewardRepo from "./reward.repository.js";
import * as walletService from "../finance/wallet/wallet.service.js";
import {
  WalletTransactionReason,
  WalletReferenceType,
} from "../finance/wallet/wallet.constants.js";
import * as referralEvents from "./referral.events.js";
import {
  REFERRAL_STATUS,
  REWARD_TYPES,
  REFERRAL_REWARD_AMOUNT,
} from "./referral.types.js";


export const issueReward = async (referralId) => {
  return prisma.$transaction(async (tx) => {
    const referral = await referralRepo.findReferralById(referralId, tx);

    if (!referral) {
      throw new Error(`Referral ${referralId} not found`);
    }

    // Only qualified referrals can be rewarded
    if (referral.status !== REFERRAL_STATUS.QUALIFIED) {
      console.log(
        `Referral ${referralId} is ${referral.status}, skipping reward`,
      );
      return null;
    }

    // Check if reward already exists
    const existingReward = await rewardRepo.findByReferralId(referral.id, tx);

    if (existingReward) {
      console.log(`Reward already exists for referral ${referralId}`);
      return existingReward;
    }

    // Determine reward type based on referrer
    const isInfluencer = referral.campaignId !== null;
    const rewardType = isInfluencer ? REWARD_TYPES.CASH : REWARD_TYPES.COINS;
    const rewardAmount = isInfluencer
      ? 0 // Will be calculated from purchases
      : REFERRAL_REWARD_AMOUNT.USER;

    // Create the reward
    const reward = await rewardRepo.createReward(
      {
        referralId: referral.id,
        beneficiaryId: referral.referrerId,
        rewardType,
        amount: rewardAmount,
        status: "PENDING",
      },
      tx,
    );

    // Update referral with reward ID
    await referralRepo.updateReferral(
      referral.id,
      {
        rewardId: reward.id,
      },
      tx,
    );

    // Process the reward based on type
    if (rewardType === REWARD_TYPES.COINS) {
      await processCoinReward(reward, tx);
    } else if (rewardType === REWARD_TYPES.CASH) {
      // Cash rewards are handled by influencer earning service
      // Just mark as issued for now
      await rewardRepo.updateReward(
        reward.id,
        {
          status: "ISSUED",
          processedAt: new Date(),
        },
        tx,
      );
    }

    return reward;
  });
};

const processCoinReward = async (reward, tx) => {
  // Credit coins to user's wallet
  await walletService.creditCoins({
    userId: reward.beneficiaryId,
    coins: Number(reward.amount),
    reason: WalletTransactionReason.REFERRAL_BONUS,
    referenceType: WalletReferenceType.REFERRAL,
    referenceId: reward.referralId,
    metadata: {
      rewardId: reward.id,
    },
    db: tx,
  });

  // Update reward status
  await rewardRepo.updateReward(
    reward.id,
    {
      status: "ISSUED",
      processedAt: new Date(),
    },
    tx,
  );

  // Update referral status
  await referralRepo.updateReferral(
    reward.referralId,
    {
      status: REFERRAL_STATUS.REWARDED,
      rewardedAt: new Date(),
    },
    tx,
  );

  // Emit event
  referralEvents.emitReferralRewarded({
    rewardId: reward.id,
    referralId: reward.referralId,
    beneficiaryId: reward.beneficiaryId,
    amount: Number(reward.amount),
    rewardType: reward.rewardType,
    timestamp: new Date(),
  });
};
