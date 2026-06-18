// ---------------------------------------------------------------------------
// Conversation room events
// ---------------------------------------------------------------------------

export const emitMessageReceived = (io, conversationId, message) => {
  io.to(conversationId).emit("message_received", {
    message,
  });
};

export const emitConversationUpdated = (io, participantIds, payload) => {
  participantIds.forEach((userId) => {
    io.to(`user:${userId}`).emit("conversation_updated", payload);
  });
};

export const emitStageUnlockPaid = (io, conversationId, payload) => {
  io.to(conversationId).emit("stage_unlock_paid", payload);
};

export const emitStageUnlocked = (io, conversationId, payload) => {
  io.to(conversationId).emit("stage_unlocked", payload);
};

export const emitReadReceipt = (io, conversationId, payload) => {
  io.to(conversationId).emit("read_receipt", payload);
};

export const emitConversationBlocked = (io, conversationId, payload) => {
  io.to(conversationId).emit("conversation_blocked", payload);
};

// ---------------------------------------------------------------------------
// Match → conversation creation events
//
// Sent to each participant's personal room (user:<id>) so their chat list
// updates immediately without a manual refresh, even before they open the app.
// ---------------------------------------------------------------------------

/**
 * Notify both participants that a new conversation has been created for them.
 * Fired once after MATCH_CREATED creates the Conversation row.
 */
export const emitNewConversation = (io, participantIds, conversation) => {
  participantIds.forEach((userId) => {
    io.to(`user:${userId}`).emit("new_conversation", conversation);
  });
};

/**
 * Push the opening system message ("You matched ❤️") into the conversation
 * room so any connected clients receive it without polling.
 */
export const emitSystemMessage = (io, conversationId, message) => {
  io.to(conversationId).emit("message_received", { message });
};
