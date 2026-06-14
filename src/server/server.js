import express from "express";
import cors from "cors";
import "../events/index.js";

import authRoutes from "../modules/auth/auth.routes.js";
import onboardingRouter from "../modules/onboarding/onboarding.routes.js";
import profileRouter from "../modules/profiles/profileRouter.js";
import matchRouter from "../modules/matching/match/matchRoutes.js"
import matchRequestRouter from "../modules/matching/matchRequest/matchRequestRoutes.js";
import { errorMiddleware } from "../middlewares/errorMiddleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.set("trust proxy", 1);

app.use(errorMiddleware);

// Root endpoint for health checks
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LovdUp API running",
  });
});

// Version 1 Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/onboarding", onboardingRouter);
app.use("/api/v1/profile", profileRouter);
app.use("/api/v1/matches", matchRouter);
app.use("/api/v1/match-requests", matchRequestRouter);


export default app;
