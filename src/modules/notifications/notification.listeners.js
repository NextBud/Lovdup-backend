import { EVENT_TYPES } from "../../events/eventTypes.js";
import { safeListener } from "../../events/helpers/registerListener.js";
import * as userDb from "../../services/user/userDbService.js";
import * as notificationService from "../../modules/notifications/notification.service.js";
import * as whatsappService from "../../services/whatsapp/whatsapp.service.js";
import { NOTIFICATION_TYPES } from "../../modules/notifications/notification.constants.js";

let registered = false;

export const registerNotificationListeners = () => {
  if (registered) {
    return;
  }

  registered = true;

  // ---------------------------------------------------------------------------
  // Connection request accepted
  // ---------------------------------------------------------------------------

  safeListener(
    EVENT_TYPES.MATCH_REQUEST_ACCEPTED,
    async ({ requestId, requesterId, accepterId, requestType }) => {
      if (!requestId || !requesterId || !accepterId) {
        return;
      }

      await notificationService.createNotification({
        recipientId: requesterId,
        actorId: accepterId,
        type: NOTIFICATION_TYPES.CONNECTION_REQUEST_ACCEPTED,
        entityId: requestId,
        metadata: {
          requestType,
        },
      });
    },
  );

  // ---------------------------------------------------------------------------
  // Match request received
  // ---------------------------------------------------------------------------

  safeListener(
    EVENT_TYPES.MATCH_REQUEST_SENT,
    async ({ requestId, senderId, receiverId, requestType }) => {
      if (!requestId || !senderId || !receiverId) {
        return;
      }

      await notificationService.createNotification({
        recipientId: receiverId,
        actorId: senderId,
        type: NOTIFICATION_TYPES.CONNECTION_REQUEST_RECEIVED,
        entityId: requestId,
        metadata: {
          requestType,
        },
      });
    },
  );

  // ---------------------------------------------------------------------------
  // New match
  //
  // Fired after the match transaction has successfully committed.
  //
  // Responsibilities:
  //   1. Create in-app notification for User A
  //   2. Create in-app notification for User B
  //   3. Send WhatsApp notification to User A
  //   4. Send WhatsApp notification to User B
  // ---------------------------------------------------------------------------

  safeListener(
    EVENT_TYPES.MATCH_CREATED,
    async ({ matchId, userAId, userBId }) => {
      if (!matchId || !userAId || !userBId) {
        console.warn("[MATCH_CREATED] Invalid event payload", {
          matchId,
          userAId,
          userBId,
        });

        return;
      }

      // Fetch both users once. The same data is used for both the in-app
      // notification context and WhatsApp notification.
      const [userA, userB] = await Promise.all([
        userDb.findWhatsAppContactById(userAId),
        userDb.findWhatsAppContactById(userBId),
      ]);

      if (!userA || !userB) {
        console.warn("[MATCH_CREATED] Unable to find match participants", {
          matchId,
          userAId,
          userBId,
          userAFound: !!userA,
          userBFound: !!userB,
        });
      }

      const userAName =
        userA?.profile?.identity?.firstName?.trim() || "Someone";

      const userBName =
        userB?.profile?.identity?.firstName?.trim() || "Someone";

      const results = await Promise.allSettled([
        // ---------------------------------------------------------------------
        // In-app notification → User A
        // ---------------------------------------------------------------------

        notificationService.createNotification({
          recipientId: userAId,
          actorId: userBId,
          type: NOTIFICATION_TYPES.NEW_MATCH,
          entityId: matchId,
        }),

        // ---------------------------------------------------------------------
        // In-app notification → User B
        // ---------------------------------------------------------------------

        notificationService.createNotification({
          recipientId: userBId,
          actorId: userAId,
          type: NOTIFICATION_TYPES.NEW_MATCH,
          entityId: matchId,
        }),

        // ---------------------------------------------------------------------
        // WhatsApp → User A
        // ---------------------------------------------------------------------

        whatsappService.sendMatchWhatsApp({
          phone: userA?.whatsappPhone || userA?.phone,
          matchedUserName: userBName,
          matchId,
          recipientId: userAId,
        }),

        // ---------------------------------------------------------------------
        // WhatsApp → User B
        // ---------------------------------------------------------------------

        whatsappService.sendMatchWhatsApp({
          phone: userB?.whatsappPhone || userB?.phone,
          matchedUserName: userAName,
          matchId,
          recipientId: userBId,
        }),
      ]);

      // -----------------------------------------------------------------------
      // Notification result logging
      // -----------------------------------------------------------------------

      const labels = [
        "IN_APP_USER_A",
        "IN_APP_USER_B",
        "WHATSAPP_USER_A",
        "WHATSAPP_USER_B",
      ];

      results.forEach((result, index) => {
        const label = labels[index];

        if (result.status === "fulfilled") {
          const value = result.value;

          if (value?.sent === false) {
            console.warn(`[MATCH_CREATED] ${label} skipped`, {
              matchId,
              userAId,
              userBId,
              reason: value.reason,
            });
          }

          return;
        }

        console.error(`[MATCH_CREATED] ${label} failed`, {
          matchId,
          userAId,
          userBId,
          error: result.reason,
        });
      });
    },
  );

  // ---------------------------------------------------------------------------
  // New message
  // ---------------------------------------------------------------------------

  safeListener(
    EVENT_TYPES.MESSAGE_SENT,
    async ({ conversationId, message, senderId, recipientId }) => {
      if (!senderId || !recipientId || !message?.id) {
        return;
      }

      await notificationService.createNotification({
        recipientId,
        actorId: senderId,
        type: NOTIFICATION_TYPES.NEW_MESSAGE,
        entityId: message.id,
        metadata: {
          conversationId,
          messageType: message.type,
        },
      });
    },
  );

  // ---------------------------------------------------------------------------
  // Conversation stage unlocked
  // ---------------------------------------------------------------------------

  safeListener(
    EVENT_TYPES.STAGE_UNLOCKED,
    async ({ conversationId, stage, unlockedStage, userAId, userBId }) => {
      const stageNumber = unlockedStage ?? stage;

      if (!userAId || !userBId || !stageNumber) {
        return;
      }

      await Promise.all([
        notificationService.createNotification({
          recipientId: userAId,
          type: NOTIFICATION_TYPES.STAGE_UNLOCKED,
          entityId: conversationId,
          metadata: {
            conversationId,
            stage: stageNumber,
          },
        }),

        notificationService.createNotification({
          recipientId: userBId,
          type: NOTIFICATION_TYPES.STAGE_UNLOCKED,
          entityId: conversationId,
          metadata: {
            conversationId,
            stage: stageNumber,
          },
        }),
      ]);
    },
  );

  // ---------------------------------------------------------------------------
  // Coins awarded
  // ---------------------------------------------------------------------------

  safeListener(
    EVENT_TYPES.COINS_AWARDED,
    async ({ userId, amount, transactionId, reason }) => {
      if (!userId || !amount) {
        return;
      }

      await notificationService.createNotification({
        recipientId: userId,
        type: NOTIFICATION_TYPES.COINS_AWARDED,
        entityId: transactionId ?? null,
        metadata: {
          amount,
          reason,
        },
      });
    },
  );

  // ---------------------------------------------------------------------------
  // Coin purchase completed
  // ---------------------------------------------------------------------------

  safeListener(
    EVENT_TYPES.COIN_PURCHASE_COMPLETED,
    async ({ userId, amount, transactionId, packageId }) => {
      if (!userId || !amount) {
        return;
      }

      await notificationService.createNotification({
        recipientId: userId,
        type: NOTIFICATION_TYPES.COIN_PURCHASE_COMPLETED,
        entityId: transactionId ?? null,
        metadata: {
          amount,
          packageId,
        },
      });
    },
  );
};
