import prisma from "../../config/prisma.js";
import * as campaignRepo from "./campaign.repository.js";
import { NotFoundException } from "../../classes/errorClasses.js";

export const getCampaignDashboard = async () => {
  const [activeCampaigns, totalCampaigns, totalParticipants, totalReferrals] =
    await Promise.all([
      prisma.campaign.count({
        where: { status: "ACTIVE" },
      }),
      prisma.campaign.count(),
      prisma.campaignParticipant.count(),
      prisma.referral.count({
        where: {
          campaignId: { not: null },
        },
      }),
    ]);

  // Get top performing campaigns
  const topCampaigns = await prisma.campaign.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      _count: {
        select: {
          participants: true,
          referrals: true,
        },
      },
    },
    orderBy: {
      referrals: {
        _count: "desc",
      },
    },
    take: 5,
  });

  return {
    summary: {
      activeCampaigns,
      totalCampaigns,
      totalParticipants,
      totalReferrals,
    },
    topCampaigns,
  };
};

export const getCampaignAnalytics = async (campaignId) => {
  const campaign = await campaignRepo.findCampaignById(campaignId);

  if (!campaign) {
    throw new NotFoundException("Campaign not found");
  }

  const [participants, referrals, earnings, payouts] = await Promise.all([
    prisma.campaignParticipant.findMany({
      where: { campaignId },
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
        referrals: {
          include: {
            referredUser: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    identity: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.referral.findMany({
      where: { campaignId },
      include: {
        referrer: {
          select: {
            id: true,
            email: true,
          },
        },
        referredUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
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
      _count: true,
    }),
    prisma.payout.count({
      where: {
        influencerProfile: {
          campaignParticipants: {
            some: {
              campaignId,
            },
          },
        },
      },
    }),
  ]);

  const totalEarnings = earnings._sum.commissionAmount || 0;
  const totalEarningsCount = earnings._count;

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
    },
    participants: {
      total: participants.length,
      list: participants.map((p) => ({
        id: p.id,
        influencerId: p.influencerProfileId,
        brandName: p.influencerProfile.brandName,
        email: p.influencerProfile.user.email,
        status: p.status,
        referralsCount: p.referrals.length,
      })),
    },
    referrals: {
      total: referrals.length,
      list: referrals.map((r) => ({
        id: r.id,
        referrerId: r.referrerId,
        referredUserId: r.referredUserId,
        status: r.status,
        createdAt: r.createdAt,
      })),
    },
    earnings: {
      total: totalEarnings,
      count: totalEarningsCount,
    },
    payouts: {
      total: payouts,
    },
  };
};
