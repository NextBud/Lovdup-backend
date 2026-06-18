import app  from "./src/server/server.js";
import { env } from "./src/lib/env.js";
import prisma from "./src/config/prisma.js";
import http from "http";
import { initializeSocket } from "./src/socket/index.js";

const server = http.createServer(app);

initializeSocket(server);

server.listen(env.port, () => {
  console.log(`[Server] Running on port ${env.port} (${env.nodeEnv})`);
});

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("[DB] Database connected");

    app.listen(env.port, () => {
      console.log(`[Server] Running on port ${env.port} (${env.nodeEnv})`);
    });
  } catch (error) {
    console.error("[Server] Failed to start:", error);
    process.exit(1);
  }
};

startServer();

// ── GRACEFUL SHUTDOWN ─────────────────────────
const shutdown = async (signal) => {
  console.log(`[Server] ${signal} received — shutting down`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", async (err) => {
  console.error("[Server] Uncaught exception:", err);
  await prisma.$disconnect();
  process.exit(1);
});
