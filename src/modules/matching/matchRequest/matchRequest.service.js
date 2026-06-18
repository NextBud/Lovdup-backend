import { getPrice } from "../../../config/pricing.service.js";
import * as walletService from "../../../services/wallet/wallet.service.js";
import * as matchRequestDb from "./matchRequest.db.js";
import * as matchDb from "../match/match.db.js";
import { eventBus } from "../../../events/eventBus.js";
import { EVENT_TYPES } from "../../../events/eventTypes.js";
import configService from "../../../classes/configClass.js";
import {
  BadRequestError,
  ConflictException,
  ForbiddenError,
  NotFoundException,
} from "../../../classes/errorClasses.js";

const normalizePair = (a, b) => [a, b].sort();

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

const hasRequestExpired = (request) =>
  request.expiresAt && new Date(request.expiresAt) < new Date();

const ensureUserCanReceiveRequest = (user) => {
  if (!user) throw new NotFoundException("Receiver not found");
  if (user.status !== "ACTIVE" || !user.isActive || user.isSuspended) {
    throw new BadRequestError("This user cannot receive match requests");
  }
  if (!user.profile) {
    throw new BadRequestError("This user does not have a completed profile");
  }
};

export const createMatchRequest = async (senderId, payload) => {
  const { receiverId, type, message, voiceNoteUrl } = payload;
  const price = getPrice("matching.requestMatch");

  if (senderId === receiverId) {
    throw new BadRequestError("You cannot send a match request to yourself");
  }

  // All guards run before the transaction
  const receiver = await matchRequestDb.findUserById(receiverId);
  ensureUserCanReceiveRequest(receiver);

  const existingRequest = await matchRequestDb.findRequestBetweenUsers({
    senderId,
    receiverId,
  });
  if (existingRequest && existingRequest.status !== "EXPIRED") {
    throw new ConflictException("You already sent a request to this user");
  }

  const reverseRequest = await matchRequestDb.findRequestBetweenUsers({
    senderId: receiverId,
    receiverId: senderId,
  });

  const shouldAutoMatch =
    reverseRequest?.status === "PENDING" && !hasRequestExpired(reverseRequest);

  // Transaction lives entirely in the DB layer
  const { createdRequest, match } =
    await matchRequestDb.createRequestWithAutoMatch({
      senderId,
      receiverId,
      requestPayload: {
        senderId,
        receiverId,
        type,
        message: message || null,
        voiceNoteUrl: voiceNoteUrl || null,
        expiresAt: getMatchRequestExpiryDate(),
      },
      reverseRequestId: shouldAutoMatch ? reverseRequest.id : null,
      debitCoins: (trx) =>
        walletService.debitCoins({
          userId: senderId,
          amount: price.amount,
          reason: price.action,
          description: price.description,
          metadata: { receiverId, type },
          trx,
        }),
      createMatch: matchDb.createMatchIfNotExists,
      normalizePair,
    });

  // Events fire after the transaction commits
  eventBus.emit(EVENT_TYPES.MATCH_REQUEST_SENT, {
    requestId: createdRequest.id,
    senderId,
    receiverId,
    requestType: type,
  });

  if (match) {
    eventBus.emit(EVENT_TYPES.MATCH_CREATED, {
      matchId: match.id,
      ...normalizePair(senderId, receiverId).reduce(
        (acc, id, i) => ({ ...acc, [`user${i === 0 ? "A" : "B"}Id`]: id }),
        {},
      ),
    });
  }

  return createdRequest;
};

export const getSentMatchRequests = async (userId) => {
  return matchRequestDb.findSentRequests({ userId });
};

export const getReceivedMatchRequests = async (userId) => {
  return matchRequestDb.findReceivedRequests({ userId });
};

export const respondToMatchRequest = async ({ userId, requestId, status }) => {
  const request = await matchRequestDb.findById(requestId);

  if (!request) throw new NotFoundException("Match request not found");
  if (request.receiverId !== userId) {
    throw new ForbiddenError("You cannot respond to this match request");
  }
  if (request.status !== "PENDING") {
    throw new BadRequestError("This match request has already been handled");
  }

  if (hasRequestExpired(request)) {
    // Single atomic update — no transaction needed for one write
    await matchRequestDb.updateStatus({ requestId, status: "EXPIRED" });
    throw new BadRequestError("This match request has expired");
  }

  const { handledRequest, match } = await matchRequestDb.respondToRequest({
    requestId,
    status,
    senderId: request.senderId,
    receiverId: request.receiverId,
    createMatch: matchDb.createMatchIfNotExists,
    normalizePair,
  });

  if (match) {
    const [userAId, userBId] = normalizePair(
      request.senderId,
      request.receiverId,
    );
    eventBus.emit(EVENT_TYPES.MATCH_CREATED, {
      matchId: match.id,
      userAId,
      userBId,
    });
  }

  return handledRequest;
};

export const getMatchRequestById = async (requestId, trx = null) => {
  return matchRequestDb.findById(requestId, trx);
};
