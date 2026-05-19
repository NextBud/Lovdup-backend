import prisma from "../../config/prisma.js";
import {
  BadRequestError,
  ConflictException,
  ForbiddenError,
  NotFoundException,
} from "../../lib/classes/errorClasses.js";
import configService  from "../../../classes/configClass.js";
import { getPrice } from "../../config/pricing.service.js";
import * as walletService from "../../wallet/wallet.service.js";
import * as matchRequestDb from "./matchRequest.db.js";
import * as matchDb from "../match/match.db.js";
import { eventBus } from "../../events/eventBus.js";
import { EVENT_TYPES } from "../../events/eventTypes.js";

const normalizePair = (userOneId, userTwoId) => {
  return [userOneId, userTwoId].sort();
};

const getMatchRequestExpiryDate = () => {
  const expiryDays = Number(
    configService.getOrThrow("MATCH_REQUEST_EXPIRY_DAYS"),
  );

  if (!Number.isInteger(expiryDays) || expiryDays <= 0) {
    throw new BadRequestError("Invalid MATCH_REQUEST_EXPIRY_DAYS config");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  return expiresAt;
};

const hasRequestExpired = (request) => {
  return request.expiresAt && new Date(request.expiresAt) < new Date();
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

const emitEvents = (eventPayloads) => {
  for (const event of eventPayloads) {
    eventBus.emit(event.type, event.payload);
  }
};

export const createMatchRequest = async (senderId, payload) => {
  const eventPayloads = [];
  const price = getPrice("matching.requestMatch");

  const request = await prisma.$transaction(async (trx) => {
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

    if (existingRequest && existingRequest.status !== "EXPIRED") {
      throw new ConflictException("You already sent a request to this user");
    }

    const reverseRequest = await matchRequestDb.findRequestBetweenUsers({
      senderId: receiverId,
      receiverId: senderId,
      trx,
    });

    await walletService.debitCoins({
      userId: senderId,
      amount: price.amount,
      reason: price.action,
      description: price.description,
      metadata: {
        receiverId,
        type,
      },
      trx,
    });

    const createdRequest = await matchRequestDb.createRequest(
      {
        senderId,
        receiverId,
        type,
        message: message || null,
        voiceNoteUrl: voiceNoteUrl || null,
        expiresAt: getMatchRequestExpiryDate(),
      },
      trx,
    );

    eventPayloads.push({
      type: EVENT_TYPES.MATCH_REQUEST_SENT,
      payload: {
        requestId: createdRequest.id,
        senderId,
        receiverId,
        requestType: type,
      },
    });

    if (
      reverseRequest?.status === "PENDING" &&
      !hasRequestExpired(reverseRequest)
    ) {
      await matchRequestDb.updateStatus({
        requestId: reverseRequest.id,
        status: "ACCEPTED",
        trx,
      });

      await matchRequestDb.updateStatus({
        requestId: createdRequest.id,
        status: "ACCEPTED",
        trx,
      });

      const [userAId, userBId] = normalizePair(senderId, receiverId);

      const match = await matchDb.createMatchIfNotExists(
        {
          userAId,
          userBId,
        },
        trx,
      );

      eventPayloads.push({
        type: EVENT_TYPES.MATCH_CREATED,
        payload: {
          matchId: match.id,
          userAId,
          userBId,
        },
      });
    }

    return createdRequest;
  });

  emitEvents(eventPayloads);

  return request;
};

export const getSentMatchRequests = async (userId, trx = null) => {
  return matchRequestDb.findSentRequests({ userId, trx });
};

export const getReceivedMatchRequests = async (userId, trx = null) => {
  return matchRequestDb.findReceivedRequests({ userId, trx });
};

export const respondToMatchRequest = async ({ userId, requestId, status }) => {
  const eventPayloads = [];

  const updatedRequest = await prisma.$transaction(async (trx) => {
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

    if (hasRequestExpired(request)) {
      await matchRequestDb.updateStatus({
        requestId,
        status: "EXPIRED",
        trx,
      });

      throw new BadRequestError("This match request has expired");
    }

    const handledRequest = await matchRequestDb.updateStatus({
      requestId,
      status,
      trx,
    });

    if (status === "ACCEPTED") {
      const [userAId, userBId] = normalizePair(
        request.senderId,
        request.receiverId,
      );

      const match = await matchDb.createMatchIfNotExists(
        {
          userAId,
          userBId,
        },
        trx,
      );

      eventPayloads.push({
        type: EVENT_TYPES.MATCH_CREATED,
        payload: {
          matchId: match.id,
          userAId,
          userBId,
        },
      });
    }

    return handledRequest;
  });

  emitEvents(eventPayloads);

  return updatedRequest;
};
