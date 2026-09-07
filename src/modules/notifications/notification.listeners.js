import { EVENT_TYPES } from "../../events/eventTypes.js";
import { safeListener } from "../../events/helpers/registerListener.js";
import * as userDb from "../../services/user/userDbService.js";
import * as notificationService from "../../modules/notifications/notification.service.js";
import { dispatchNotification } from "../../modules/notifications/notification.dispatcher.js";
import { NOTIFICATION_TYPES } from "../../modules/notifications/notification.constants.js";

let registered = false;

// =============================================================================
// Notification Event Listeners
// =============================================================================

export const registerNotificationListeners = () => {
  if (registered) {
    return;
  }

  registered = true;

  // ===========================================================================
  // MATCH REQUEST ACCEPTED
  // ===========================================================================

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

  // ===========================================================================
  // MATCH REQUEST SENT
  // ===========================================================================

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

  // ===========================================================================
  // MATCH CREATED
  //
  // Fired after the match transaction has successfully committed.
  //
  // Channels:
  //   - In-app
  //   - Email
  //   - WhatsApp
  //
  // Each participant receives their own notification with the other
  // participant as the actor.
  // ===========================================================================

  safeListener(
    EVENT_TYPES.MATCH_CREATED,
    async ({ matchId, userAId, userBId }) => {
      // -----------------------------------------------------------------------
      // Validate event payload
      // -----------------------------------------------------------------------

      if (!matchId || !userAId || !userBId) {
        console.warn("[MATCH_CREATED] Invalid event payload", {
          matchId,
          userAId,
          userBId,
        });

        return;
      }

      // -----------------------------------------------------------------------
      // Load notification recipients
      // -----------------------------------------------------------------------

      const [userA, userB] = await Promise.all([
        userDb.findNotificationRecipientById(userAId),
        userDb.findNotificationRecipientById(userBId),
      ]);

      if (!userA || !userB) {
        console.warn("[MATCH_CREATED] Unable to find match participants", {
          matchId,
          userAId,
          userBId,
          userAFound: Boolean(userA),
          userBFound: Boolean(userB),
        });

        return;
      }

      // -----------------------------------------------------------------------
      // Resolve display names
      // -----------------------------------------------------------------------

      const userAName =
        userA.profile?.identity?.firstName?.trim() || "Someone";

      const userBName =
        userB.profile?.identity?.firstName?.trim() || "Someone";

      // -----------------------------------------------------------------------
      // Dispatch notifications
      //
      // User A receives User B's identity as the matched user.
      // User B receives User A's identity as the matched user.
      // -----------------------------------------------------------------------

      const results = await Promise.allSettled([
        dispatchNotification({
          recipientId: userAId,
          recipient: userA,
          actorId: userBId,
          type: NOTIFICATION_TYPES.NEW_MATCH,
          entityId: matchId,
          metadata: {
            matchedUserName: userBName,
          },
        }),

        dispatchNotification({
          recipientId: userBId,
          recipient: userB,
          actorId: userAId,
          type: NOTIFICATION_TYPES.NEW_MATCH,
          entityId: matchId,
          metadata: {
            matchedUserName: userAName,
          },
        }),
      ]);

      // -----------------------------------------------------------------------
      // Log delivery results
      // -----------------------------------------------------------------------

      results.forEach((result, index) => {
        const recipientId = index === 0 ? userAId : userBId;

        if (result.status === "fulfilled") {
          console.log("[MATCH_CREATED] Notification dispatched", {
            matchId,
            recipientId,
            deliveries: result.value?.deliveries,
          });

          return;
        }

        console.error("[MATCH_CREATED] Notification dispatch failed", {
          matchId,
          recipientId,
          error: result.reason,
        });
      });
    },
  );

  // ===========================================================================
  // MESSAGE SENT
  // ===========================================================================

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

  // ===========================================================================
  // STAGE UNLOCKED
  // ===========================================================================

  safeListener(
    EVENT_TYPES.STAGE_UNLOCKED,
    async ({
      conversationId,
      stage,
      unlockedStage,
      userAId,
      userBId,
    }) => {
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

  // ===========================================================================
  // COINS AWARDED
  // ===========================================================================

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

  // ===========================================================================
  // COIN PURCHASE COMPLETED
  // ===========================================================================

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

