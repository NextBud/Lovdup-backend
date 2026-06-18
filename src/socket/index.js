import { Server } from "socket.io";
import { authenticateSocket } from "./socket.auth.js";
import { registerChatHandlers } from "../modules/converstaions/conversation.socket.js";
import { registerConversationListeners } from "../events/listeners/conversation.listeners.js";
import { registerMatchingListeners } from "../events/listeners/matching.listeners.js";

export const initializeSocket = (server) => {
  console.info("[Socket] Initializing Socket.io server layer...");

  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  // Middleware logging wrapper
  io.use((socket, next) => {
    console.log(`[Socket] Inbound connection attempt (ID: ${socket.id})`);

    authenticateSocket(socket, (err) => {
      if (err) {
        console.warn(
          `[Socket] Authentication failed for socket ${socket.id}: ${err.message}`,
        );
        return next(err);
      }
      console.log(
        `[Socket] Authenticated user: ${socket.user?.id || "Unknown ID"}`,
      );
      next();
    });
  });

  // Global event system tracking
  console.log("[Socket] Registering cross-cutting event listeners...");
  registerConversationListeners(io);
  registerMatchingListeners(io);

  io.on("connection", (socket) => {
    const userId = socket.user?.id;
    const roomName = `user:${userId}`;

    console.info(
      `[Socket] Client connected safely | Socket ID: ${socket.id} | User ID: ${userId}`,
    );

    // Track dynamic room pooling
    socket.join(roomName);
    console.log(
      `[Socket] Socket ${socket.id} joined personal sync pipeline: [${roomName}]`,
    );

    // Attach functional message channel orchestrators
    registerChatHandlers(io, socket);

    // Monitor connection degradation
    socket.on("disconnect", (reason) => {
      console.warn(
        `[Socket] Client disconnected | Socket ID: ${socket.id} | User ID: ${userId} | Reason: ${reason}`,
      );
    });

    // Optional: Log manual errors thrown by individual client sockets
    socket.on("error", (error) => {
      console.error(
        `[Socket] Error encountered on socket ${socket.id}:`,
        error,
      );
    });
  });

  console.info("[Socket] Server layer bound and listening successfully.");
  return io;
};
