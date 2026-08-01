import asyncWrapper from "../../lib/asyncWrapper.js";
import * as campaignService from "./campaign.service.js";

export const createCampaign = asyncWrapper(async (req, res) => {
  const data = {
    ...req.body,
    createdById: req.user.userId,
  };

  const campaign = await campaignService.createCampaign(data);

  res.status(201).json({
    success: true,
    message: "Campaign created successfully",
    data: campaign,
  });
});

export const getCampaigns = asyncWrapper(async (req, res) => {
  const { status, type, search, startDate, endDate } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (type) filters.type = type;
  if (search) filters.search = search;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const campaigns = await campaignService.getCampaigns(filters);

  res.status(200).json({
    success: true,
    data: campaigns,
  });
});

export const getCampaign = asyncWrapper(async (req, res) => {
  const campaign = await campaignService.getCampaign(req.params.id);

  res.status(200).json({
    success: true,
    data: campaign,
  });
});

export const updateCampaign = asyncWrapper(async (req, res) => {
  const campaign = await campaignService.updateCampaign(
    req.params.id,
    req.body,
  );

  res.status(200).json({
    success: true,
    message: "Campaign updated successfully",
    data: campaign,
  });
});

export const deleteCampaign = asyncWrapper(async (req, res) => {
  const result = await campaignService.deleteCampaign(req.params.id);

  res.status(200).json({
    success: true,
    message: "Campaign deleted successfully",
    data: result,
  });
});

export const addInfluencerToCampaign = asyncWrapper(async (req, res) => {
  const { campaignId, influencerId } = req.params;

  const result = await campaignService.addInfluencerToCampaign(
    campaignId,
    influencerId,
  );

  res.status(201).json({
    success: true,
    message: "Influencer added to campaign successfully",
    data: result,
  });
});

export const removeInfluencerFromCampaign = asyncWrapper(async (req, res) => {
  const { campaignId, influencerId } = req.params;

  const result = await campaignService.removeInfluencerFromCampaign(
    campaignId,
    influencerId,
  );

  res.status(200).json({
    success: true,
    message: "Influencer removed from campaign successfully",
    data: result,
  });
});

export const getCampaignStats = asyncWrapper(async (req, res) => {
  const stats = await campaignService.getCampaignStats(req.params.id);

  res.status(200).json({
    success: true,
    data: stats,
  });
});
