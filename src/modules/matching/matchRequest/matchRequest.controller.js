import asyncWrapper from "../../../lib/asyncWrapper.js";
import * as matchRequestService from "./matchRequest.service.js";

export const createMatchRequest = asyncWrapper(async (req, res) => {
  const senderId = req.user.id;

  const request = await matchRequestService.createMatchRequest(
    senderId,
    req.body,
  );

  res.status(201).json({
    success: true,
    message: "Match request sent successfully",
    data: request,
  });
});

export const getSentMatchRequests = asyncWrapper(async (req, res) => {
  const userId = req.user.id;

  const requests = await matchRequestService.getSentMatchRequests(userId);

  res.status(200).json({
    success: true,
    message: "Sent match requests fetched successfully",
    data: requests,
  });
});

export const getReceivedMatchRequests = asyncWrapper(async (req, res) => {
  const userId = req.user.id;

  const requests = await matchRequestService.getReceivedMatchRequests(userId);

  res.status(200).json({
    success: true,
    message: "Received match requests fetched successfully",
    data: requests,
  });
});

export const respondToMatchRequest = asyncWrapper(async (req, res) => {
  const userId = req.user.id;
  const { requestId } = req.params;
  const { status } = req.body;

  const request = await matchRequestService.respondToMatchRequest({
    userId,
    requestId,
    status,
  });

  res.status(200).json({
    success: true,
    message: `Match request ${status.toLowerCase()} successfully`,
    data: request,
  });
});
