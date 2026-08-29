import * as notificationDb from "./notification.db.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundException,
} from "../../classes/errorClasses.js";
import { NOTIFICATION_TEMPLATES } from "./notification.templates.js";

export const createNotification = async ({
  recipientId,
  actorId = null,
  type,
  entityId = null,
  metadata = null,
}) => {
  if (!recipientId) {
    throw new BadRequestError("Notification recipient is required");
  }

  if (!type) {
    throw new BadRequestError("Notification type is required");
  }

  // Never create a notification for a user's own action.
  if (actorId && actorId === recipientId) {
    return null;
  }

  return notificationDb.createNotification({
    recipientId,
    actorId,
    type,
    entityId,
    metadata,
  });
};

export const getNotifications = async ({
  recipientId,
  limit = 20,
  cursor = null,
}) => {
  const rows = await notificationDb.findNotifications({
    recipientId,
    limit,
    cursor,
  });

  const hasMore = rows.length > limit;
  const notifications = hasMore ? rows.slice(0, limit) : rows;

  return {
    notifications: notifications.map(formatNotification),
    nextCursor: hasMore
      ? (notifications[notifications.length - 1]?.id ?? null)
      : null,
  };
};

export const getUnreadCount = async (recipientId) => {
  return notificationDb.countUnread(recipientId);
};

export const markNotificationRead = async ({ notificationId, recipientId }) => {
  await notificationDb.markRead({
    notificationId,
    recipientId,
  });
};

export const markAllNotificationsRead = async (recipientId) => {
  await notificationDb.markAllRead(recipientId);
};

const formatNotification = (notification) => {
  const template = NOTIFICATION_TEMPLATES[notification.type];

  const actorName =
    notification.actor?.profile?.identity?.firstName ?? "Someone";

  const metadata = notification.metadata ?? {};

  const templateData = {
    ...metadata,
    actorName,
  };

  return {
    id: notification.id,
    type: notification.type,
    title: template?.title ?? "LovdUp",
    body: template?.body
      ? template.body(templateData)
      : "You have a new notification.",
    actor: notification.actor,
    entityId: notification.entityId,
    metadata: notification.metadata,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
};