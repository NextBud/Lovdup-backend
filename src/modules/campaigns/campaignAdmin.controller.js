// src/modules/campaigns/campaignAdmin.controller.js
import asyncWrapper from "../../lib/asyncWrapper.js";
import * as campaignAdminService from "./campaignAdmin.service.js";

export const getCampaignDashboard = asyncWrapper(async (req, res) => {
  const dashboard = await campaignAdminService.getCampaignDashboard();

  res.status(200).json({
    success: true,
    data: dashboard,
  });
});

export const getCampaignAnalytics = asyncWrapper(async (req, res) => {
  const analytics = await campaignAdminService.getCampaignAnalytics(
    req.params.id,
  );

  res.status(200).json({
    success: true,
    data: analytics,
  });
});
