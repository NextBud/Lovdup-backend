// src/modules/influencers/influencerAdmin.routes.js
import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { adminMiddleware } from "../../middlewares/adminMiddleware.js";
import * as controller from "./influencerAdmin.controller.js";

const adminRouter = Router();

// All admin routes require authentication and admin role
adminRouter.use(authMiddleware);
adminRouter.use(adminMiddleware);

// Influencer Management
adminRouter.post("/influencers", controller.createInfluencer);
adminRouter.get("/influencers", controller.getAllInfluencers);
adminRouter.get("/influencers/:id", controller.getInfluencer);
adminRouter.put("/influencers/:id", controller.updateInfluencer);
adminRouter.get("/influencers/:id/stats", controller.getInfluencerStats);
adminRouter.get("/influencers/:id/earnings", controller.getInfluencerEarnings);
adminRouter.get(
  "/influencers/:id/referrals",
  controller.getInfluencerReferrals,
);

// Payout Management
adminRouter.get("/payouts/pending", controller.getPendingPayouts);
adminRouter.post("/influencers/:influencerId/payouts", controller.createPayout);
adminRouter.post("/payouts/:payoutId/complete", controller.completePayout);
adminRouter.post("/payouts/:payoutId/cancel", controller.cancelPayout);

export default adminRouter;
