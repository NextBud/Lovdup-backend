import { EVENT_TYPES } from "../../events/eventTypes.js";
import * as conversationEvents from "../../modules/converstaions/conversation.events.js";
import { safeListener } from "../helpers/registerListener.js";

// FIX: removed unused `eventBus` import — subscriptions go through
// safeListener which wraps eventBus.on internally.

let registered = false;

export const registerConversationListeners = (io) => {
  if (registered) return;

  registered = true;

  // ---------------------------------------------------------------------------
  // Messaging
  // ---------------------------------------------------------------------------

  safeListener(EVENT_TYPES.MESSAGE_SENT, ({ conversationId, message }) => {
    conversationEvents.emitMessageReceived(io, conversationId, message);
  });

  // ---------------------------------------------------------------------------
  // Stage unlocks
  //
  // FIX: was listening on STAGE_UNLOCK_REQUESTED which no longer exists.
  // Now correctly listens on STAGE_UNLOCK_PAID (one user paid, partner may
  // not have yet) and STAGE_UNLOCKED (both paid, stage advanced).
  // ---------------------------------------------------------------------------

  safeListener(EVENT_TYPES.STAGE_UNLOCK_PAID, (payload) => {
    conversationEvents.emitStageUnlockPaid(io, payload.conversationId, payload);
  });

  safeListener(EVENT_TYPES.STAGE_UNLOCKED, (payload) => {
    conversationEvents.emitStageUnlocked(io, payload.conversationId, payload);
  });

  // ---------------------------------------------------------------------------
  // Read receipts & lifecycle
  // ---------------------------------------------------------------------------

  safeListener(EVENT_TYPES.CONVERSATION_READ, (payload) => {
    conversationEvents.emitReadReceipt(io, payload.conversationId, payload);
  });

  safeListener(EVENT_TYPES.CONVERSATION_BLOCKED, (payload) => {
    conversationEvents.emitConversationBlocked(
      io,
      payload.conversationId,
      payload,
    );
  });
};
