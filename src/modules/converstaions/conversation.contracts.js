// Message Types

export const MESSAGE_TYPES = {
  SYSTEM: "SYSTEM",
  TEXT: "TEXT",
  VOICE: "VOICE",
  PHOTO: "PHOTO",
  CONTACT: "CONTACT",
};

// Socket Events

export const SOCKET_EVENTS = {
  JOIN_CONVERSATION: "join_conversation",
  JOINED_CONVERSATION: "joined_conversation",

  SEND_MESSAGE: "send_message",
  MESSAGE_RECEIVED: "message_received",

  UNLOCK_STAGE: "unlock_stage",
  UNLOCK_STAGE_SUCCESS: "unlock_stage_success",

  STAGE_UNLOCK_REQUESTED: "stage_unlock_requested",
  STAGE_UNLOCKED: "stage_unlocked",

  MARK_READ: "mark_read",
  READ_RECEIPT: "read_receipt",

  CONVERSATION_BLOCKED: "conversation_blocked",

  ERROR: "error",
};

// Conversation Stages

export const CONVERSATION_STAGES = {
  TEXT: 1,
  VOICE: 2,
  PHOTO: 3,
  CONTACT: 5,
};
