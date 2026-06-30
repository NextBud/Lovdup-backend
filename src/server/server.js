import express from "express";
import cors from "cors";

import authRoutes from "../modules/auth/auth.routes.js";
import onboardingRouter from "../modules/onboarding/onboarding.routes.js";
import profileRouter from "../modules/profiles/profileRouter.js";
import matchRouter from "../modules/matching/match/matchRoutes.js";
import matchRequestRouter from "../modules/matching/matchRequest/matchRequestRoutes.js";
import conversationRouter from "../modules/converstaions/conversation.routes.js";
import packageRouter from "../modules/finance/coin-packages/coinPackage.routes.js";
import purchaseRouter from "../modules/finance/purchases/purchase.routes.js";
import paymentRouter from "../modules/finance/payment/payment.routes.js";
import { errorMiddleware } from "../middlewares/errorMiddleware.js";

const app = express();

app.use(cors());
app.use(express.json());

app.set("trust proxy", 1);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LovdUp API running",
  });
});

app.use("/api/v1/auth", authRoutes); // working
app.use("/api/v1/onboarding", onboardingRouter); //working
app.use("/api/v1/profile", profileRouter); // working
app.use("/api/v1/matches", matchRouter); //working
app.use("/api/v1/match-requests", matchRequestRouter); // working
app.use("/api/v1/conversations", conversationRouter);
app.use("/api/v1/package", packageRouter)
app.use("/api/v1/purchase", purchaseRouter)
app.use("/api/v1/payment", paymentRouter)



app.use(errorMiddleware);

export default app;
