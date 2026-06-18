import http from "http";
import app from "./src/server/server.js";
import { env } from "./src/lib/env.js";
import prisma from "./src/config/prisma.js";
import { initializeSocket } from "./src/socket/index.js";

const server = http.createServer(app);

// Initialize WebSockets on top of our HTTP server
initializeSocket(server);

/**
 * Starts the application lifecycle by verifying core infrastructure 
 * dependencies (Database) before exposing the network ports.
 */
const startServer = async () => {
  try {
    // 1. Ensure Database is alive first
    await prisma.$connect();
    console.log("[DB] Database connected");

    // 2. Start the single, unified HTTP + Socket server
    server.listen(env.port, () => {
      console.log(`[Server] Running on port ${env.port} (${env.nodeEnv})`);
    });
  } catch (error) {
    console.error("[Server] Critical initialization failure:", error);
    process.exit(1);
  }
};

// Kick off initialization
startServer();

// ── GRACEFUL SHUTDOWN MANAGEMENT ─────────────────────────

const shutdown = async (signal) => {
  console.log(`[Server] ${signal} received — initiating graceful shutdown`);
  
  // Close network server ports to stop accepting new traffic
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("[DB] Database disconnected smoothly");
      process.exit(0);
    } catch (err) {
      console.error("[Server] Error disconnecting database during shutdown:", err);
      process.exit(1);
    }
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", async (err) => {
  console.error("[Server] Uncaught exception:", err);
  try {
    await prisma.$disconnect();
  } catch (dbErr) {
    console.error("[DB] Failed to disconnect after crash:", dbErr);
  }
  process.exit(1);
});