import { COMMISSION_PERCENTAGE } from "./influencer.types.js";
import * as earningRepo from "./influencerEarning.repository.js";
import * as referralRepo from "./influencerReferral.repository.js";

export const processPurchaseForInfluencer = async (purchaseId, tx = null) => {
  const db = tx || prisma;

  // 1. Get purchase details
  const purchase = await db.coinPurchase.findUnique({
    where: { id: purchaseId },
    include: {
      user: true,
    },
  });

  if (!purchase) {
    console.log(`Purchase ${purchaseId} not found`);
    return null;
  }

  // 2. Check if user was referred by an influencer
  const referral = await referralRepo.findReferralByUserId(purchase.userId, db);

  if (!referral || referral.status !== "QUALIFIED") {
    console.log(
      `No qualified influencer referral found for user ${purchase.userId}`,
    );
    return null;
  }

  // 3. Check if earning already exists
  const existingEarning = await earningRepo.findEarningByPurchaseId(
    purchase.id,
    db,
  );

  if (existingEarning) {
    return existingEarning;
  }

  // 4. Calculate commission (20% of purchase amount)
  const commissionAmount = purchase.amountPaid.mul(COMMISSION_PERCENTAGE);

  // 5. Create earning record
  const earning = await earningRepo.createEarning(
    {
      influencerId: referral.influencerId,
      referredUserId: purchase.userId,
      purchaseId: purchase.id,
      purchaseAmount: purchase.amountPaid,
      commissionAmount: commissionAmount,
      status: "PENDING",
    },
    db,
  );

  // 6. Update referral status to REWARDED
  if (referral.status !== "REWARDED") {
    await referralRepo.updateReferralStatus(referral.id, "REWARDED", db);
  }

  return earning;
};

export const getInfluencerEarnings = async (influencerId, filters = {}) => {
  const [earnings, totalAgg, pendingAgg] = await Promise.all([
    earningRepo.findEarningsByInfluencerId(influencerId, filters),
    earningRepo.aggregateEarningsByInfluencerId(influencerId, "PAID"),
    earningRepo.aggregateEarningsByInfluencerId(influencerId, "PENDING"),
  ]);

  return {
    earnings,
    summary: {
      totalPaid: totalAgg._sum.commissionAmount || 0,
      pending: pendingAgg._sum.commissionAmount || 0,
      count: earnings.length,
    },
  };
};
