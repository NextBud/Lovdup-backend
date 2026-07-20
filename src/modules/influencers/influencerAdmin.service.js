// src/modules/influencers/influencerAdmin.service.js
import prisma from "../../config/prisma.js";
import { generateReferralCode } from "../referral/referralCodeGenerator.js";
import {
  BadRequestError,
  NotFoundException,
} from "../../classes/errorClasses.js";
import * as influencerRepo from "./influencer.repository.js";
import * as earningRepo from "./influencerEarning.repository.js";
import * as referralRepo from "./influencerReferral.repository.js";

export const createInfluencer = async (data) => {
  const { email, brandName, paymentMethod, paymentReference, notes } = data;

  return prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestError(`User with email ${email} already exists`);
    }

    const user = await tx.user.create({
      data: {
        email,
        isInfluencer: true,
        role: "INFLUENCER",
        // Generate temporary password - admin will set later or send magic link
        passwordHash: await hashPassword(generateTemporaryPassword()),
      },
    });

    // 3. Create influencer profile
    const influencerProfile = await influencerRepo.createInfluencerProfile(
      {
        userId: user.id,
        brandName: brandName || null,
        paymentMethod: paymentMethod || null,
        paymentReference: paymentReference || null,
        notes: notes || null,
        status: "ACTIVE",
      },
      tx,
    );

    // 4. Generate referral code with LOVDUP brand
    const referralCode = generateReferralCode("LOVDUP");

    // 5. Create referral code
    await tx.referralCode.create({
      data: {
        userId: user.id,
        code: referralCode,
      },
    });

    // 6. Automatically assign to active campaign (if any)
    const activeCampaign = await tx.campaign.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    if (activeCampaign) {
      await influencerRepo.assignInfluencerToCampaign(
        influencerProfile.id,
        activeCampaign.id,
        tx,
      );
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      influencer: influencerProfile,
      referralCode,
      campaign: activeCampaign,
    };
  });
};

export const getAllInfluencers = async (filters = {}) => {
  const { status, search } = filters;

  const where = {};
  if (status) {
    where.status = status;
  }

  // Search by brand name or email
  if (search) {
    where.OR = [
      { brandName: { contains: search, mode: "insensitive" } },
      {
        user: {
          email: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  return prisma.influencerProfile.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      },
      campaignParticipants: {
        include: {
          campaign: true,
        },
      },
      _count: {
        select: {
          earnings: {
            where: { status: "PENDING" },
          },
          referrals: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getInfluencerDetails = async (influencerId) => {
  const influencer = await influencerRepo.findInfluencerById(influencerId);

  if (!influencer) {
    throw new NotFoundException("Influencer not found");
  }

  // Get additional stats
  const [pendingEarnings, totalEarnings, referrals] = await Promise.all([
    earningRepo.aggregateEarningsByInfluencerId(influencerId, "PENDING"),
    earningRepo.aggregateEarningsByInfluencerId(influencerId, "PAID"),
    referralRepo.findReferralsByInfluencerId(influencerId),
  ]);

  return {
    ...influencer,
    stats: {
      pendingEarnings: pendingEarnings._sum.commissionAmount || 0,
      totalEarnings: totalEarnings._sum.commissionAmount || 0,
      totalReferrals: referrals.length,
      qualifiedReferrals: referrals.filter((r) => r.status === "QUALIFIED")
        .length,
    },
  };
};

export const updateInfluencer = async (influencerId, data) => {
  const { brandName, paymentMethod, paymentReference, status, notes } = data;

  const influencer = await influencerRepo.findInfluencerById(influencerId);

  if (!influencer) {
    throw new NotFoundException("Influencer not found");
  }

  const updated = await influencerRepo.updateInfluencerProfile(influencerId, {
    brandName: brandName ?? influencer.brandName,
    paymentMethod: paymentMethod ?? influencer.paymentMethod,
    paymentReference: paymentReference ?? influencer.paymentReference,
    status: status ?? influencer.status,
    notes: notes ?? influencer.notes,
  });

  return updated;
};

export const getInfluencerAdminStats = async (influencerId) => {
  const influencer = await influencerRepo.findInfluencerById(influencerId);

  if (!influencer) {
    throw new NotFoundException("Influencer not found");
  }

  const [pendingEarnings, paidEarnings, referrals, payouts] = await Promise.all(
    [
      earningRepo.aggregateEarningsByInfluencerId(influencerId, "PENDING"),
      earningRepo.aggregateEarningsByInfluencerId(influencerId, "PAID"),
      referralRepo.findReferralsByInfluencerId(influencerId),
      prisma.payout.findMany({
        where: {
          influencerProfileId: influencerId,
        },
        orderBy: { createdAt: "desc" },
      }),
    ],
  );

  return {
    influencer: {
      id: influencer.id,
      brandName: influencer.brandName,
      status: influencer.status,
      createdAt: influencer.createdAt,
    },
    earnings: {
      pending: pendingEarnings._sum.commissionAmount || 0,
      paid: paidEarnings._sum.commissionAmount || 0,
      total:
        (pendingEarnings._sum.commissionAmount || 0) +
        (paidEarnings._sum.commissionAmount || 0),
    },
    referrals: {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === "PENDING").length,
      qualified: referrals.filter((r) => r.status === "QUALIFIED").length,
      rewarded: referrals.filter((r) => r.status === "REWARDED").length,
    },
    payouts: {
      total: payouts.length,
      processed: payouts.filter((p) => p.status === "PAID").length,
      pending: payouts.filter((p) => p.status === "PROCESSING").length,
    },
  };
};

export const getPendingPayouts = async () => {
  const payouts = await prisma.payout.findMany({
    where: {
      status: "PROCESSING",
    },
    include: {
      influencerProfile: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return payouts;
};

export const createPayout = async (influencerId, data) => {
  const { amount, notes } = data;

  return prisma.$transaction(async (tx) => {
    // 1. Get pending earnings
    const pendingEarnings = await earningRepo.findEarningsByInfluencerId(
      influencerId,
      { status: "PENDING" },
      tx,
    );

    if (pendingEarnings.length === 0) {
      throw new BadRequestError("No pending earnings for this influencer");
    }

    // 2. Calculate total
    const totalAmount =
      amount ||
      pendingEarnings.reduce((sum, e) => sum + Number(e.commissionAmount), 0);

    // 3. Create payout
    const payout = await tx.payout.create({
      data: {
        influencerProfileId: influencerId,
        amount: totalAmount,
        status: "PROCESSING",
        metadata: {
          notes,
          earningsCount: pendingEarnings.length,
          earningIds: pendingEarnings.map((e) => e.id),
        },
      },
    });

    // 4. Update earnings status
    await earningRepo.updateEarningStatus(
      pendingEarnings.map((e) => e.id),
      {
        status: "PROCESSING",
        payoutId: payout.id,
      },
      tx,
    );

    return payout;
  });
};

export const completePayout = async (payoutId) => {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException("Payout not found");
    }

    if (payout.status === "PAID") {
      throw new BadRequestError("Payout is already completed");
    }

    const updated = await tx.payout.update({
      where: { id: payoutId },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    // Update earnings status
    const earningIds = payout.metadata?.earningIds || [];
    if (earningIds.length > 0) {
      await earningRepo.updateEarningStatus(
        earningIds,
        {
          status: "PAID",
        },
        tx,
      );
    }

    return updated;
  });
};

export const cancelPayout = async (payoutId) => {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException("Payout not found");
    }

    if (payout.status === "PAID") {
      throw new BadRequestError("Cannot cancel a paid payout");
    }

    const updated = await tx.payout.update({
      where: { id: payoutId },
      data: {
        status: "FAILED",
      },
    });

    // Revert earnings status
    const earningIds = payout.metadata?.earningIds || [];
    if (earningIds.length > 0) {
      await earningRepo.updateEarningStatus(
        earningIds,
        {
          status: "PENDING",
          payoutId: null,
        },
        tx,
      );
    }

    return updated;
  });
};

export const getInfluencerEarnings = async (influencerId, filters = {}) => {
  const { status, startDate, endDate } = filters;

  const earningFilters = {};
  if (status) earningFilters.status = status;
  if (startDate) earningFilters.startDate = startDate;
  if (endDate) earningFilters.endDate = endDate;

  const earnings = await earningRepo.findEarningsByInfluencerId(
    influencerId,
    earningFilters,
  );

  const summary =
    await earningRepo.aggregateEarningsByInfluencerId(influencerId);

  return {
    earnings,
    summary: {
      totalPaid: summary._sum.commissionAmount || 0,
      count: earnings.length,
    },
  };
};

export const getInfluencerReferrals = async (influencerId, filters = {}) => {
  const { status } = filters;

  const referralFilters = {};
  if (status) referralFilters.status = status;

  const referrals = await referralRepo.findReferralsByInfluencerId(
    influencerId,
    referralFilters,
  );

  return referrals;
};

// Helper functions
const generateTemporaryPassword = () => {
  return crypto.randomBytes(16).toString("hex");
};

const hashPassword = async (password) => {
  // Implement your password hashing logic
  // Example with bcrypt:
  // const bcrypt = require('bcrypt');
  // return bcrypt.hash(password, 12);
  return password; // Placeholder
};
