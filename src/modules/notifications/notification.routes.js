import { Router } from "express";
import * as notificationController from "./notification.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const notificationRouter = Router();

notificationRouter.use(authMiddleware);

// Get notifications
notificationRouter.get("/", notificationController.getNotifications);

// Get unread notification count
notificationRouter.get("/unread-count", notificationController.getUnreadCount);

// Mark a notification as read
notificationRouter.patch(
  "/:notificationId/read",
  notificationController.markNotificationRead,
);

// Mark all notifications as read
notificationRouter.patch(
  "/read-all",
  notificationController.markAllNotificationsRead,
);

export default notificationRouter;
