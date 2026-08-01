// src/modules/campaigns/campaign.repository.js
import prisma from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

// Campaign CRUD
export const createCampaign = async (data, tx = null) => {
  const db = dbClient(tx);
  return db.campaign.create({
    data,
    include: {
      campaignRewards: true,
      createdBy: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
};

export const findCampaignById = async (id, tx = null) => {
  const db = dbClient(tx);
  return db.campaign.findUnique({
    where: { id },
    include: {
      campaignRewards: true,
      createdBy: {
        select: {
          id: true,
          email: true,
        },
      },
      participants: {
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
      },
      referrals: {
        include: {
          referrer: {
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
  });
};

export const findCampaigns = async (filters = {}, tx = null) => {
  const db = dbClient(tx);
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.startDate) {
    where.startsAt = { gte: new Date(filters.startDate) };
  }

  if (filters.endDate) {
    where.endsAt = { lte: new Date(filters.endDate) };
  }

  return db.campaign.findMany({
    where,
    include: {
      campaignRewards: true,
      _count: {
        select: {
          participants: true,
          referrals: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const updateCampaign = async (id, data, tx = null) => {
  const db = dbClient(tx);
  return db.campaign.update({
    where: { id },
    data,
    include: {
      campaignRewards: true,
    },
  });
};

export const deleteCampaign = async (id, tx = null) => {
  const db = dbClient(tx);
  return db.campaign.delete({
    where: { id },
  });
};

// Campaign Rewards
export const createCampaignReward = async (data, tx = null) => {
  const db = dbClient(tx);
  return db.campaignReward.create({
    data,
  });
};

export const findCampaignRewards = async (campaignId, tx = null) => {
  const db = dbClient(tx);
  return db.campaignReward.findMany({
    where: { campaignId },
  });
};

export const updateCampaignReward = async (id, data, tx = null) => {
  const db = dbClient(tx);
  return db.campaignReward.update({
    where: { id },
    data,
  });
};

export const deleteCampaignReward = async (id, tx = null) => {
  const db = dbClient(tx);
  return db.campaignReward.delete({
    where: { id },
  });
};

// Campaign Participants
export const addParticipantToCampaign = async (data, tx = null) => {
  const db = dbClient(tx);
  return db.campaignParticipant.create({
    data,
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
  });
};

export const findCampaignParticipants = async (campaignId, tx = null) => {
  const db = dbClient(tx);
  return db.campaignParticipant.findMany({
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
    },
  });
};

export const updateCampaignParticipant = async (id, data, tx = null) => {
  const db = dbClient(tx);
  return db.campaignParticipant.update({
    where: { id },
    data,
  });
};

export const removeParticipantFromCampaign = async (id, tx = null) => {
  const db = dbClient(tx);
  return db.campaignParticipant.delete({
    where: { id },
  });
};

export const findActiveCampaign = async (tx = null) => {
  const db = dbClient(tx);
  return db.campaign.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
      OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });
};
