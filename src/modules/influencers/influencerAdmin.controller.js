// src/modules/influencers/influencerAdmin.controller.js
import asyncWrapper from "../../lib/asyncWrapper.js";
import * as adminService from "./influencerAdmin.service.js";
import { NotFoundException } from "../../classes/errorClasses.js";

export const createInfluencer = asyncWrapper(async (req, res) => {
  const result = await adminService.createInfluencer(req.body);

  res.status(201).json({
    success: true,
    message: "Influencer created successfully",
    data: result,
  });
});

export const getAllInfluencers = asyncWrapper(async (req, res) => {
  const { status, search } = req.query;
  const filters = {};

  if (status) {
    filters.status = status;
  }

  if (search) {
    filters.search = search;
  }

  const influencers = await adminService.getAllInfluencers(filters);

  res.status(200).json({
    success: true,
    data: influencers,
  });
});

export const getInfluencer = asyncWrapper(async (req, res) => {
  const influencer = await adminService.getInfluencerDetails(req.params.id);

  res.status(200).json({
    success: true,
    data: influencer,
  });
});

export const updateInfluencer = asyncWrapper(async (req, res) => {
  const result = await adminService.updateInfluencer(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: "Influencer updated successfully",
    data: result,
  });
});

export const getInfluencerStats = asyncWrapper(async (req, res) => {
  const stats = await adminService.getInfluencerAdminStats(req.params.id);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

export const getPendingPayouts = asyncWrapper(async (req, res) => {
  const payouts = await adminService.getPendingPayouts();

  res.status(200).json({
    success: true,
    data: payouts,
  });
});

export const createPayout = asyncWrapper(async (req, res) => {
  const { influencerId } = req.params;
  const { amount, notes } = req.body;

  const result = await adminService.createPayout(influencerId, {
    amount,
    notes,
  });

  res.status(201).json({
    success: true,
    message: "Payout created successfully",
    data: result,
  });
});

export const completePayout = asyncWrapper(async (req, res) => {
  const { payoutId } = req.params;

  const result = await adminService.completePayout(payoutId);

  res.status(200).json({
    success: true,
    message: "Payout completed successfully",
    data: result,
  });
});

export const cancelPayout = asyncWrapper(async (req, res) => {
  const { payoutId } = req.params;

  const result = await adminService.cancelPayout(payoutId);

  res.status(200).json({
    success: true,
    message: "Payout cancelled successfully",
    data: result,
  });
});

export const getInfluencerEarnings = asyncWrapper(async (req, res) => {
  const { influencerId } = req.params;
  const { status, startDate, endDate } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const earnings = await adminService.getInfluencerEarnings(
    influencerId,
    filters,
  );

  res.status(200).json({
    success: true,
    data: earnings,
  });
});

export const getInfluencerReferrals = asyncWrapper(async (req, res) => {
  const { influencerId } = req.params;
  const { status } = req.query;

  const filters = {};
  if (status) filters.status = status;

  const referrals = await adminService.getInfluencerReferrals(
    influencerId,
    filters,
  );

  res.status(200).json({
    success: true,
    data: referrals,
  });
});
