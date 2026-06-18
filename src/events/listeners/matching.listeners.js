import { EVENT_TYPES } from "../eventTypes.js";
import * as conversationService from "../../modules/converstaions/conversation.service.js";
import * as conversationEvents from "../../modules/converstaions/conversation.events.js";
import { safeListener } from "../helpers/registerListener.js";

// FIX: was using raw eventBus.on with async callbacks — unhandled rejections
// would silently drop events once real logic was added. Now uses safeListener
// for consistent error handling across all listeners.
//
// FIX: now accepts `io` so conversation creation can immediately push socket
// events to both participants without them needing to poll or refresh.

let registered = false;

export const registerMatchingListeners = (io) => {
  if (registered) return;

  registered = true;

  // ---------------------------------------------------------------------------
  // Match request sent
  //
  // Placeholder — enqueue push/email notification here when ready.
  // Payload: { requestId, senderId, receiverId, requestType }
  // ---------------------------------------------------------------------------

  safeListener(EVENT_TYPES.MATCH_REQUEST_SENT, (payload) => {
    // TODO: enqueue notification to receiverId
    console.log("MATCH_REQUEST_SENT event:", payload);
  });

  // ---------------------------------------------------------------------------
  // Match created
  //
  // Fired by matchRequest.service.js after both users have expressed interest
  // (auto-match on send, or after an explicit accept).
  //
  // Payload: { matchId, userAId, userBId }
  //
  // Responsibilities:
  //   1. Create the Conversation row + opening system message
  //   2. Push the new conversation to both participants' personal rooms so
  //      their chat list updates in real time
  //   3. Push the opening system message into the conversation room
  // ---------------------------------------------------------------------------

  safeListener(
    EVENT_TYPES.MATCH_CREATED,
    async ({ matchId, userAId, userBId }) => {
      const { conversation, systemMessage } =
        await conversationService.createConversationForMatch(matchId);

      // Notify both users' personal rooms — chat list updates immediately
      conversationEvents.emitNewConversation(
        io,
        [userAId, userBId],
        conversation,
      );

      // Push the opening system message into the conversation room.
      // Only reaches clients already in the room (unlikely at this point,
      // but correct for any edge case where both users are active).
      conversationEvents.emitSystemMessage(io, conversation.id, systemMessage);

      // TODO: enqueue push/email notification to both users
    },
  );
};
