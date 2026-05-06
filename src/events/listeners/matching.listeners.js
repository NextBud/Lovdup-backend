import { eventBus } from "../eventBus.js";
import { EVENT_TYPES } from "../eventTypes.js";

eventBus.on(EVENT_TYPES.MATCH_REQUEST_SENT, async (payload) => {
  console.log("MATCH_REQUEST_SENT event:", payload);

  // Later:
  // - enqueue notification
  // - send email/push
});

eventBus.on(EVENT_TYPES.MATCH_CREATED, async (payload) => {
  console.log("MATCH_CREATED event:", payload);

  // Later:
  // - create/open chat room
  // - notify both users
});
