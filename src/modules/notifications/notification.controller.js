import asyncWrapper from "../../lib/asyncWrapper.js";
import * as notificationService from "./notification.service.js";

export const getNotifications = asyncWrapper(async (req, res) => {
  const { limit, cursor } = req.query;

  const result = await notificationService.getNotifications({
    recipientId: req.user.userId,
    limit: limit ? Number(limit) : 20,
    cursor: cursor || null,
  });

  return res.status(200).json({
    success: true,
    data: result,
  });
});

export const getUnreadCount = asyncWrapper(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.userId);

  return res.status(200).json({
    success: true,
    data: {
      count,
    },
  });
});

export const markNotificationRead = asyncWrapper(async (req, res) => {
  await notificationService.markNotificationRead({
    notificationId: req.params.notificationId,
    recipientId: req.user.userId,
  });

  return res.status(200).json({
    success: true,
    message: "Notification marked as read.",
  });
});

export const markAllNotificationsRead = asyncWrapper(async (req, res) => {
  await notificationService.markAllNotificationsRead(req.user.userId);

  return res.status(200).json({
    success: true,
    message: "All notifications marked as read.",
  });
});
