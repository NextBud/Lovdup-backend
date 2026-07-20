import asyncWrapper from "../../lib/asyncWrapper.js";
import * as influencerService from "./influencer.service.js";

export const getDashboard = asyncWrapper(async (req, res) => {
  const dashboard = await influencerService.getInfluencerDashboard(
    req.user.userId,
  );

  res.status(200).json({
    success: true,
    data: dashboard,
  });
});

export const getReferralCode = asyncWrapper(async (req, res) => {
  const code = await influencerService.getReferralCode(req.user.userId);

  res.status(200).json({
    success: true,
    data: { code },
  });
});

export const getReferrals = asyncWrapper(async (req, res) => {
  const referrals = await influencerService.getInfluencerReferrals(
    req.user.userId,
    req.query,
  );

  res.status(200).json({
    success: true,
    data: referrals,
  });
});

export const getEarnings = asyncWrapper(async (req, res) => {
  const earnings = await influencerService.getInfluencerEarnings(
    req.user.userId,
    req.query,
  );

  res.status(200).json({
    success: true,
    data: earnings,
  });
});
