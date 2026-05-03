import asyncWrapper from "../../lib/asyncWrapper.js";
import * as discoveryService from "./discovery.service.js";

export const requestDiscoveryMatches = asyncWrapper(async (req, res) => {
  const viewerId = req.user.id;

  const matches = await discoveryService.requestDiscoveryMatches(viewerId);

  res.status(200).json({
    success: true,
    message: "Discovery matches generated successfully",
    data: matches,
  });
});

export const getLatestDiscoveryMatches = asyncWrapper(async (req, res) => {
  const viewerId = req.user.id;

  const matches = await discoveryService.getLatestDiscoveryMatches(viewerId);

  res.status(200).json({
    success: true,
    message: "Latest discovery matches fetched successfully",
    data: matches,
  });
});
