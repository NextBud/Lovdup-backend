import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { adminMiddleware } from "../../middlewares/adminMiddleware.js";
import * as controller from "./campaign.controller.js";
import * as adminController from "./campaignAdmin.controller.js";

const campaignRouter = Router();

// Admin routes
campaignRouter.use(authMiddleware);
campaignRouter.use(adminMiddleware);

// Campaign CRUD
campaignRouter.post("/", controller.createCampaign);
campaignRouter.get("/", controller.getCampaigns);
campaignRouter.get("/:id", controller.getCampaign);
campaignRouter.put("/:id", controller.updateCampaign);
campaignRouter.delete("/:id", controller.deleteCampaign);

// Campaign stats
campaignRouter.get("/:id/stats", controller.getCampaignStats);

// Campaign participants
campaignRouter.post(
  "/:campaignId/influencers/:influencerId",
  controller.addInfluencerToCampaign,
);
campaignRouter.delete(
  "/:campaignId/influencers/:influencerId",
  controller.removeInfluencerFromCampaign,
);

// Campaign admin dashboard
campaignRouter.get("/admin/dashboard", adminController.getCampaignDashboard);
campaignRouter.get(
  "/admin/:id/analytics",
  adminController.getCampaignAnalytics,
);

export default campaignRouter;
