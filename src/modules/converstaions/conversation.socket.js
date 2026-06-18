import * as conversationService from "./conversation.service.js";
import { SOCKET_EVENTS } from "./conversation.contracts.js";

const socketWrapper = (socket, handler) => async (payload) => {
  try {
    await handler(payload);
  } catch (err) {
    socket.emit("error", {
      code:
        err.statusCode === 403
          ? "FORBIDDEN"
          : err.statusCode === 404
            ? "NOT_FOUND"
            : err.statusCode === 400
              ? "BAD_REQUEST"
              : "SERVER_ERROR",
      message: err.message,
    });
  }
};

export const registerChatHandlers = (io, socket) => {
  const userId = socket.user.id;

  // ---------------------------------------------------------------------------
  // Join Conversation
  // ---------------------------------------------------------------------------

  socket.on(
    "join_conversation",
    socketWrapper(socket, async ({ conversationId }) => {
      await conversationService.joinConversation(conversationId, userId);

      socket.join(conversationId);

      socket.emit("joined_conversation", {
        conversationId,
      });
    }),
  );

  // ---------------------------------------------------------------------------
  // Send Message
  // ---------------------------------------------------------------------------

socket.on(
  SOCKET_EVENTS.SEND_MESSAGE,
  socketWrapper(socket, async (payload) => {
    const message = await conversationService.sendMessage(
      payload.conversationId,
      userId,
      payload,
    );
  }),
);

  // ---------------------------------------------------------------------------
  // Unlock Stage
  // ---------------------------------------------------------------------------

  socket.on(
    "unlock_stage",
    socketWrapper(socket, async (payload) => {
      const result = await conversationService.unlockStage(
        payload.conversationId,
        userId,
        payload.targetStage,
      );

      // Stage events are handled by conversation.listeners.js

      socket.emit("unlock_stage_success", result);
    }),
  );

  // ---------------------------------------------------------------------------
  // Mark Read
  // ---------------------------------------------------------------------------

  socket.on(
    "mark_read",
    socketWrapper(socket, async ({ conversationId }) => {
      await conversationService.markRead(conversationId, userId);

      // Read receipt broadcast handled by listeners
    }),
  );

  // ---------------------------------------------------------------------------
  // Leave Conversation
  // ---------------------------------------------------------------------------

  socket.on("leave_conversation", ({ conversationId }) => {
    if (!conversationId) return;

    socket.leave(conversationId);
  });
};
