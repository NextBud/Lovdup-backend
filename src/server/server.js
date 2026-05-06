import express from "express";
import cors from "cors";
import "./events/index.js";
import authRoutes from "./auth/authRoutes.js";
import onboardingRoutes from "./onboarding/onboardingRoutes.js";
import errorMiddleware from "./middlewares/errorMiddleware.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LovdUp API running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/onboarding", onboardingRoutes);

app.use(errorMiddleware);

export default app;
