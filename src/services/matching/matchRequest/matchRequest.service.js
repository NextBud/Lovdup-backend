import prisma from "../../config/prisma.js";
import {
  BadRequestError,
  ConflictException,
  ForbiddenError,
  NotFoundException,
} from "../../lib/classes/errorClasses.js";
import * as matchRequestDb from "./matchRequest.db.js";
import * as matchDb from "../match/match.db.js";

const normalizePair = (userOneId, userTwoId) => {
  return [userOneId, userTwoId].sort();
};

const ensureUserCanReceiveRequest = (user) => {
  if (!user) {
    throw new NotFoundException("Receiver not found");
  }

  if (user.status !== "ACTIVE" || !user.isActive || user.isSuspended) {
    throw new BadRequestError("This user cannot receive match requests");
  }

  if (!user.profile) {
    throw new BadRequestError("This user does not have a completed profile");
  }
};

export const createMatchRequest = async (senderId, payload) => {
  return prisma.$transaction(async (trx) => {
    const { receiverId, type, message, voiceNoteUrl } = payload;

    if (senderId === receiverId) {
      throw new BadRequestError("You cannot send a match request to yourself");
    }

    const receiver = await matchRequestDb.findUserById(receiverId, trx);
    ensureUserCanReceiveRequest(receiver);

    const existingRequest = await matchRequestDb.findRequestBetweenUsers({
      senderId,
      receiverId,
      trx,
    });

    if (existingRequest) {
      throw new ConflictException("You already sent a request to this user");
    }

    const reverseRequest = await matchRequestDb.findRequestBetweenUsers({
      senderId: receiverId,
      receiverId: senderId,
      trx,
    });

    const request = await matchRequestDb.createRequest(
      {
        senderId,
        receiverId,
        type,
        message: message || null,
      },
      trx,
    );

    if (reverseRequest?.status === "PENDING") {
      await matchRequestDb.updateStatus({
        requestId: reverseRequest.id,
        status: "ACCEPTED",
        trx,
      });

      await matchRequestDb.updateStatus({
        requestId: request.id,
        status: "ACCEPTED",
        trx,
      });

      const [userAId, userBId] = normalizePair(senderId, receiverId);

      await matchDb.createMatchIfNotExists(
        {
          userAId,
          userBId,
        },
        trx,
      );
    }

    return request;
  });
};

export const getSentMatchRequests = async (userId, trx = null) => {
  return matchRequestDb.findSentRequests({ userId, trx });
};

export const getReceivedMatchRequests = async (userId, trx = null) => {
  return matchRequestDb.findReceivedRequests({ userId, trx });
};

export const respondToMatchRequest = async ({ userId, requestId, status }) => {
  return prisma.$transaction(async (trx) => {
    const request = await matchRequestDb.findById(requestId, trx);

    if (!request) {
      throw new NotFoundException("Match request not found");
    }

    if (request.receiverId !== userId) {
      throw new ForbiddenError("You cannot respond to this match request");
    }

    if (request.status !== "PENDING") {
      throw new BadRequestError("This match request has already been handled");
    }

    const updatedRequest = await matchRequestDb.updateStatus({
      requestId,
      status,
      trx,
    });

    if (status === "ACCEPTED") {
      const [userAId, userBId] = normalizePair(
        request.senderId,
        request.receiverId,
      );

      await matchDb.createMatchIfNotExists(
        {
          userAId,
          userBId,
        },
        trx,
      );
    }

    return updatedRequest;
  });
};
