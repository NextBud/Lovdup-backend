import * as userDb from "../../services/user/userDbService.js";
import * as notificationService from "./notification.service.js";
import * as emailNotificationService from "../../services/email/email.notification.service.js";
// import * as whatsappNotificationService from "../../services/whatsapp/whatsapp.notification.service.js";

import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
} from "./notification.constants.js";

import { NOTIFICATION_CHANNEL_POLICIES } from "./notification.channel.js";

// =============================================================================
// CHANNEL HANDLERS
// =============================================================================

const EMAIL_HANDLERS = {
  [NOTIFICATION_TYPES.NEW_MATCH]: emailNotificationService.sendNewMatchEmail,
};

// WhatsApp temporarily disabled.
// const WHATSAPP_HANDLERS = {
//   [NOTIFICATION_TYPES.NEW_MATCH]:
//     whatsappNotificationService.sendMatchWhatsApp,
// };

// =============================================================================
// DISPATCH NOTIFICATION
// =============================================================================

export const dispatchNotification = async ({
  recipientId,
  recipient = null,
  actorId = null,
  type,
  entityId = null,
  metadata = null,
}) => {
  // ---------------------------------------------------------------------------
  // Validate
  // ---------------------------------------------------------------------------

  if (!recipientId) {
    throw new Error("Notification recipient is required");
  }

  if (!type) {
    throw new Error("Notification type is required");
  }

  // Prevent self-notifications.
  if (actorId && actorId === recipientId) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Resolve channels
  // ---------------------------------------------------------------------------

  const channels = NOTIFICATION_CHANNEL_POLICIES[type] ?? [
    NOTIFICATION_CHANNELS.IN_APP,
  ];

  // ---------------------------------------------------------------------------
  // Resolve recipient
  // ---------------------------------------------------------------------------

  const resolvedRecipient =
    recipient || (await userDb.findNotificationRecipientById(recipientId));

  if (!resolvedRecipient) {
    throw new Error(`Notification recipient not found: ${recipientId}`);
  }

  const recipientName =
    resolvedRecipient.profile?.identity?.firstName?.trim() || "Someone";

  // ---------------------------------------------------------------------------
  // Build channel deliveries
  // ---------------------------------------------------------------------------

  const deliveries = [];

  // ===========================================================================
  // IN-APP
  // ===========================================================================

  if (channels.includes(NOTIFICATION_CHANNELS.IN_APP)) {
    deliveries.push({
      channel: NOTIFICATION_CHANNELS.IN_APP,

      promise: notificationService.createNotification({
        recipientId,
        actorId,
        type,
        entityId,
        metadata,
      }),
    });
  }

  // ===========================================================================
  // EMAIL
  // ===========================================================================

  if (channels.includes(NOTIFICATION_CHANNELS.EMAIL)) {
    const handler = EMAIL_HANDLERS[type];

    if (handler) {
      deliveries.push({
        channel: NOTIFICATION_CHANNELS.EMAIL,

        promise: handler({
          email: resolvedRecipient.email,
          recipientName,
          matchedUserName: metadata?.matchedUserName,
          matchId: entityId,
          recipientId,
          entityId,
          metadata,
        }),
      });
    } else {
      console.warn("[Notification] No email handler configured", {
        type,
        recipientId,
      });
    }
  }

  // ===========================================================================
  // WHATSAPP
  // ===========================================================================
  //
  // Temporarily disabled.
  //
  // if (channels.includes(NOTIFICATION_CHANNELS.WHATSAPP)) {
  //   const handler = WHATSAPP_HANDLERS[type];
  //
  //   if (handler) {
  //     deliveries.push({
  //       channel: NOTIFICATION_CHANNELS.WHATSAPP,
  //
  //       promise: handler({
  //         phone:
  //           resolvedRecipient.whatsappPhone ||
  //           resolvedRecipient.phone,
  //
  //         recipientName,
  //         matchedUserName: metadata?.matchedUserName,
  //         matchId: entityId,
  //         recipientId,
  //         entityId,
  //         metadata,
  //       }),
  //     });
  //   } else {
  //     console.warn("[Notification] No WhatsApp handler configured", {
  //       type,
  //       recipientId,
  //     });
  //   }
  // }

  // ===========================================================================
  // EXECUTE CHANNEL DELIVERIES
  // ===========================================================================

  const settled = await Promise.allSettled(
    deliveries.map((delivery) => delivery.promise),
  );

  // ===========================================================================
  // FORMAT RESULTS
  // ===========================================================================

  const results = settled.map((result, index) => {
    const channel = deliveries[index].channel;

    if (result.status === "fulfilled") {
      return {
        channel,
        ...result.value,
      };
    }

    console.error(`[Notification] ${channel} delivery failed`, {
      recipientId,
      type,
      entityId,
      error: result.reason,
    });

    return {
      channel,
      sent: false,
      reason: "CHANNEL_ERROR",
      error: result.reason,
    };
  });

  return {
    recipientId,
    type,
    entityId,
    deliveries: results,
  };
};
