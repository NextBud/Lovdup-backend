export const EVENT_TYPES = {
  // ---------------------------------------------------------------------------
  // Matching
  // ---------------------------------------------------------------------------

  MATCH_REQUEST_SENT: "MATCH_REQUEST_SENT",
  MATCH_CREATED: "MATCH_CREATED",

  // ---------------------------------------------------------------------------
  // Conversation — messaging
  // ---------------------------------------------------------------------------

  MESSAGE_SENT: "MESSAGE_SENT",

  // ---------------------------------------------------------------------------
  // Conversation — stage unlocks
  //
  // STAGE_UNLOCK_PAID  : one user has paid for a stage unlock (partner may not
  //                      have paid yet). Used to show "waiting on partner" UI.
  // STAGE_UNLOCKED     : both users have paid — the stage has actually advanced.
  // ---------------------------------------------------------------------------

  STAGE_UNLOCK_PAID: "STAGE_UNLOCK_PAID",
  STAGE_UNLOCKED: "STAGE_UNLOCKED",

  // ---------------------------------------------------------------------------
  // Conversation — read receipts & lifecycle
  // ---------------------------------------------------------------------------

  // FIX: key was MESSAGE_READ but value was "CONVERSATION_READ" — the service
  // emits using the key name, so EVENT_TYPES.CONVERSATION_READ was undefined
  // and read receipts were never broadcast. Key and value now match.
  CONVERSATION_READ: "CONVERSATION_READ",

  CONVERSATION_BLOCKED: "CONVERSATION_BLOCKED",
};
