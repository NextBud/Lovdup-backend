// src/routes/index.js
import express from "express";
import referralRouter from "../modules/referral/referral.routes.js";
import influencerRouter from "../modules/influencers/influencer.routes.js";
import adminInfluencerRouter from "../modules/influencers/influencerAdmin.routes.js";
import influencerReferralRouter from "../modules/influencers/influencerReferral.routes.js";

const app = express();

// Referral routes
app.use("/api/referral", referralRouter);

// Influencer routes (for logged-in influencers)
app.use("/api/influencer", influencerRouter);

// Admin routes
app.use("/api/admin", adminInfluencerRouter);

// Public referral routes for influencer codes
app.use("/api/referral", influencerReferralRouter);
