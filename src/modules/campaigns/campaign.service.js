import prisma from "../../config/prisma.js";
import {
  BadRequestError,
  NotFoundException,
} from "../../classes/errorClasses.js";
import * as campaignRepo from "./campaign.repository.js";
import {
  CAMPAIGN_STATUS,
  CAMPAIGN_TYPES,
  REWARD_TYPES,
} from "./campaign.types.js";

export const createCampaign = async (data) => {
  const { name, description, type, startsAt, endsAt, rewards, createdById } =
    data;

  return prisma.$transaction(async (tx) => {
    // 1. Create campaign
    const campaign = await campaignRepo.createCampaign(
      {
        name,
        description: description || null,
        type: type || CAMPAIGN_TYPES.INFLUENCER,
        status: CAMPAIGN_STATUS.DRAFT,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        createdById,
      },
      tx,
    );

    // 2. Create rewards if provided
    if (rewards && rewards.length > 0) {
      for (const reward of rewards) {
        await campaignRepo.createCampaignReward(
          {
            campaignId: campaign.id,
            rewardType: reward.rewardType || REWARD_TYPES.CASH,
            participantType: reward.participantType || "INFLUENCER",
            amount: reward.amount,
          },
          tx,
        );
      }
    }

    // 3. Fetch complete campaign with rewards
    return campaignRepo.findCampaignById(campaign.id, tx);
  });
};

export const getCampaigns = async (filters = {}) => {
  return campaignRepo.findCampaigns(filters);
};

export const getCampaign = async (campaignId) => {
  const campaign = await campaignRepo.findCampaignById(campaignId);

  if (!campaign) {
    throw new NotFoundException("Campaign not found");
  }

  return campaign;
};

export const updateCampaign = async (campaignId, data) => {
  const { name, description, status, startsAt, endsAt } = data;

  const campaign = await campaignRepo.findCampaignById(campaignId);

  if (!campaign) {
    throw new NotFoundException("Campaign not found");
  }

  // Validate status transitions
  if (status && status !== campaign.status) {
    validateStatusTransition(campaign.status, status);
  }

  const updated = await campaignRepo.updateCampaign(campaignId, {
    name: name || campaign.name,
    description: description !== undefined ? description : campaign.description,
    status: status || campaign.status,
    startsAt: startsAt ? new Date(startsAt) : campaign.startsAt,
    endsAt: endsAt ? new Date(endsAt) : campaign.endsAt,
  });

  return updated;
};

export const deleteCampaign = async (campaignId) => {
  const campaign = await campaignRepo.findCampaignById(campaignId);

  if (!campaign) {
    throw new NotFoundException("Campaign not found");
  }

  if (campaign.status === "ACTIVE") {
    throw new BadRequestError(
      "Cannot delete an active campaign. End it first.",
    );
  }

  await campaignRepo.deleteCampaign(campaignId);

  return { deleted: true };
};

export const addInfluencerToCampaign = async (campaignId, influencerId) => {
  return prisma.$transaction(async (tx) => {
    const campaign = await campaignRepo.findCampaignById(campaignId, tx);

    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    if (campaign.status !== CAMPAIGN_STATUS.ACTIVE) {
      throw new BadRequestError("Only active campaigns can have participants");
    }

    // Check if influencer already in campaign
    const existing = await tx.campaignParticipant.findFirst({
      where: {
        campaignId,
        influencerProfileId: influencerId,
      },
    });

    if (existing) {
      throw new BadRequestError("Influencer already in this campaign");
    }

    const participant = await campaignRepo.addParticipantToCampaign(
      {
        campaignId,
        influencerProfileId: influencerId,
        status: "ACTIVE",
      },
      tx,
    );

    return participant;
  });
};

export const removeInfluencerFromCampaign = async (
  campaignId,
  influencerId,
) => {
  return prisma.$transaction(async (tx) => {
    const participant = await tx.campaignParticipant.findFirst({
      where: {
        campaignId,
        influencerProfileId: influencerId,
      },
    });

    if (!participant) {
      throw new NotFoundException("Influencer not found in this campaign");
    }

    await campaignRepo.removeParticipantFromCampaign(participant.id, tx);

    return { removed: true };
  });
};

export const getCampaignStats = async (campaignId) => {
  const campaign = await campaignRepo.findCampaignById(campaignId);

  if (!campaign) {
    throw new NotFoundException("Campaign not found");
  }

  const [participants, referrals, totalEarnings] = await Promise.all([
    prisma.campaignParticipant.count({
      where: { campaignId },
    }),
    prisma.referral.count({
      where: { campaignId },
    }),
    prisma.influencerEarning.aggregate({
      where: {
        purchase: {
          referral: {
            campaignId,
          },
        },
      },
      _sum: {
        commissionAmount: true,
      },
    }),
  ]);

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
    },
    stats: {
      totalParticipants: participants,
      totalReferrals: referrals,
      totalEarnings: totalEarnings._sum.commissionAmount || 0,
    },
  };
};

// Helper functions
const validateStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    DRAFT: ["ACTIVE", "ENDED"],
    ACTIVE: ["PAUSED", "ENDED"],
    PAUSED: ["ACTIVE", "ENDED"],
    ENDED: [], // No transitions from ENDED
  };

  if (!validTransitions[currentStatus].includes(newStatus)) {
    throw new BadRequestError(
      `Cannot transition from ${currentStatus} to ${newStatus}`,
    );
  }
};
