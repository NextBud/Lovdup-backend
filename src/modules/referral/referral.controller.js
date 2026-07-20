// src/modules/referral/referral.controller.js
import asyncWrapper from "../../lib/asyncWrapper.js";
import * as referralService from "./referral.service.js";
import * as referralQualificationService from "./referralQualification.service.js";

export const getMyReferral = asyncWrapper(async (req, res) => {
  const referral = await referralService.getMyReferral(req.user.userId);

  res.status(200).json({
    success: true,
    data: referral,
  });
});

export const getMyReferralStats = asyncWrapper(async (req, res) => {
  const stats = await referralService.getReferralStats(req.user.userId);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

export const getMyReferralHistory = asyncWrapper(async (req, res) => {
  const { status, startDate, endDate } = req.query;
  const filters = {};

  if (status) filters.status = status;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const history = await referralService.getReferralHistory(
    req.user.userId,
    filters,
  );

  res.status(200).json({
    success: true,
    data: history,
  });
});

export const registerReferralClick = asyncWrapper(async (req, res) => {
  const {
    referralCodeId,
    ipAddress,
    userAgent,
    deviceFingerprint,
    country,
    source,
  } = req.body;

  const click = await referralService.registerReferralClick({
    referralCodeId,
    ipAddress: ipAddress || req.ip,
    userAgent: userAgent || req.headers["user-agent"],
    deviceFingerprint,
    country: country || req.headers["cf-ipcountry"],
    source,
  });

  res.status(201).json({
    success: true,
    message: "Referral click recorded.",
    data: click,
  });
});

export const validateReferralCode = asyncWrapper(async (req, res) => {
  const { code } = req.params;
  const result = await referralService.validateReferralCode(code);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const applyReferralCode = asyncWrapper(async (req, res) => {
  const { code } = req.body;
  const userId = req.user.userId;

  const result = await referralService.applyReferralCode({
    code,
    referredUserId: userId,
  });

  res.status(201).json({
    success: true,
    message: "Referral code applied successfully",
    data: result,
  });
});

export const getReferralEligibility = asyncWrapper(async (req, res) => {
  const eligibility =
    await referralQualificationService.checkReferralEligibility(
      req.user.userId,
    );

  res.status(200).json({
    success: true,
    data: eligibility,
  });
});
