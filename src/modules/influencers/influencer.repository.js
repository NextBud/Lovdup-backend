// src/modules/influencers/influencer.repository.js
import prisma from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

export const findInfluencerByUserId = async (userId, tx = null) => {
  const db = dbClient(tx);
  return db.influencerProfile.findUnique({
    where: { userId },
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
    },
  });
};

export const findInfluencerById = async (id, tx = null) => {
  const db = dbClient(tx);
  return db.influencerProfile.findUnique({
    where: { id },
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
    },
  });
};

export const createInfluencerProfile = async (data, tx = null) => {
  const db = dbClient(tx);
  return db.influencerProfile.create({
    data,
  });
};

export const updateInfluencerProfile = async (id, data, tx = null) => {
  const db = dbClient(tx);
  return db.influencerProfile.update({
    where: { id },
    data,
  });
};

export const findAllInfluencers = async (filters = {}, tx = null) => {
  const db = dbClient(tx);
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  return db.influencerProfile.findMany({
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
    },
    orderBy: { createdAt: "desc" },
  });
};

export const assignInfluencerToCampaign = async (
  influencerId,
  campaignId,
  tx = null,
) => {
  const db = dbClient(tx);
  return db.campaignParticipant.create({
    data: {
      influencerProfileId: influencerId,
      campaignId,
      status: "ACTIVE",
    },
  });
};
