import asyncWrapper from "../../lib/asyncWrapper.js";
import * as matchService from "./match.service.js";

export const getMyMatches = asyncWrapper(async (req, res) => {
  const userId = req.user.id;

  const matches = await matchService.getMyMatches(userId);

  res.status(200).json({
    success: true,
    message: "Matches fetched successfully",
    data: matches,
  });
});

export const unmatch = asyncWrapper(async (req, res) => {
  const userId = req.user.id;
  const { matchId } = req.params;

  const match = await matchService.unmatch({
    userId,
    matchId,
  });

  res.status(200).json({
    success: true,
    message: "Unmatched successfully",
    data: match,
  });
});
