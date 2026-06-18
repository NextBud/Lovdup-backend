import { Server } from "socket.io";
import { authenticateSocket } from "./socket.auth.js";
import { registerChatHandlers } from "../modules/converstaions/conversation.socket.js";
import { registerConversationListeners } from "../events/listeners/conversation.listeners.js";
import {registerMatchingListeners} from "../events/listeners/matching.listeners.js"

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.use(authenticateSocket);

  registerConversationListeners(io);
  registerMatchingListeners(io);

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);

    registerChatHandlers(io, socket);
  });

  return io;
};
