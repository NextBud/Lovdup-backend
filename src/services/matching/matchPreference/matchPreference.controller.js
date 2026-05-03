import asyncWrapper from "../../lib/asyncWrapper.js";
import * as matchPreferenceService from "./matchPreference.service.js";

export const getMyMatchPreference = asyncWrapper(async (req, res) => {
  const userId = req.user.id;

  const preference = await matchPreferenceService.getMyMatchPreference(userId);

  res.status(200).json({
    success: true,
    message: "Match preference fetched successfully",
    data: preference,
  });
});

export const upsertMyMatchPreference = asyncWrapper(async (req, res) => {
  const userId = req.user.id;

  const preference = await matchPreferenceService.upsertMyMatchPreference(
    userId,
    req.body,
  );

  res.status(200).json({
    success: true,
    message: "Match preference saved successfully",
    data: preference,
  });
});

export const deleteMyMatchPreference = asyncWrapper(async (req, res) => {
  const userId = req.user.id;

  await matchPreferenceService.deleteMyMatchPreference(userId);

  res.status(200).json({
    success: true,
    message: "Match preference deleted successfully",
  });
});
