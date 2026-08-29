import prisma from "../../config/prisma.js";

const actorSelect = {
  id: true,
  profile: {
    select: {
      identity: {
        select: {
          firstName: true,
        },
      },
    },
  },
};

export const createNotification = async ({
  recipientId,
  actorId = null,
  type,
  entityId = null,
  metadata = null,
}) => {
  return prisma.notification.create({
    data: {
      recipientId,
      actorId,
      type,
      entityId,
      metadata,
    },
    include: {
      actor: {
        select: actorSelect,
      },
    },
  });
};

export const findNotifications = async ({
  recipientId,
  limit = 20,
  cursor = null,
}) => {
  return prisma.notification.findMany({
    where: {
      recipientId,
    },

    include: {
      actor: {
        include: {
          profile: {
            include: {
              identity: true,
            },
          },
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    take: limit + 1,

    ...(cursor
      ? {
          skip: 1,
          cursor: {
            id: cursor,
          },
        }
      : {}),
  });
};


export const countUnread = async (recipientId) => {
  return prisma.notification.count({
    where: {
      recipientId,
      readAt: null,
    },
  });
};

export const markRead = async ({ notificationId, recipientId }) => {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      recipientId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
};

export const markAllRead = async (recipientId) => {
  return prisma.notification.updateMany({
    where: {
      recipientId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
};
