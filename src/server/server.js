import express from "express";
import cors from "cors";
import "../events/index.js";

import authRoutes from "../modules/auth/auth.routes.js";
// import onboardingRoutes from "../routes/onboardingRoutes.js";
import errorMiddleware from "../middlewares/errorMiddleware.js";

const app = express();

app.use(cors());
app.use(express.json());

// Root endpoint for health checks
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LovdUp API running",
  });
});

// Version 1 Routes
app.use("/api/v1/auth", authRoutes);
// app.use("/api/v1/onboarding", onboardingRoutes);

app.use(errorMiddleware);

export default app;
