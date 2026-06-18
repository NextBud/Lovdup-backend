import prisma from "../../config/prisma.js";
import * as conversationDb from "./conversation.db.js";
import * as blockService from "../block/block.service.js";
import * as walletService from "../../services/wallet/wallet.service.js";
import { findPhoneById } from "../../services/user/userDbService.js";
import { getPrice } from "../../config/pricing.service.js";
import { eventBus } from "../../events/eventBus.js";
import { EVENT_TYPES } from "../../events/eventTypes.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundException,
} from "../../classes/errorClasses.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGE_META = {
  2: {
    label: "voice messages",
    priceKey: "conversation.unlockStage2",
  },

  3: {
    label: "photo sharing",
    priceKey: "conversation.unlockStage3",
  },

  4: {
    label: "contact exchange",
    priceKey: "conversation.unlockStage4",
  },
};

const VALID_MESSAGE_TYPES = ["TEXT", "VOICE", "PHOTO", "CONTACT"];

// Minimum stage required to send each message type.
const MESSAGE_STAGE_REQUIREMENT = {
  TEXT: 1,
  VOICE: 2,
  PHOTO: 3,
  CONTACT: 4,
};

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/**
 * Format a conversation row for the ChatsList feed.
 * Picks the partner (the user who is not the viewer) from match.userA/userB.
 */
const formatConversationForList = (conversation, viewerId) => {
  const { match, lastMessage, stage } = conversation;

  const partner = match.userAId === viewerId ? match.userB : match.userA;
  const identity = partner?.profile?.identity ?? null;
  const photo = partner?.profilePhotos?.[0]?.url ?? null;

  const hasUnread =
    lastMessage &&
    lastMessage.senderId !== viewerId &&
    lastMessage.readAt === null;

  return {
    id: conversation.id,
    matchId: match.id,
    stage,
    partner: {
      id: partner.id,
      name: identity
        ? `${identity.firstName} ${identity.lastName}`.trim()
        : null,
      photo,
    },
    lastMessage: formatMessagePreview(lastMessage),
    unread: hasUnread,
    lastMessageAt: conversation.lastMessageAt,
  };
};

/**
 * Produce the short preview shown in the ChatsList row.
 * Never exposes contactValue — shows a generic label instead.
 */
const formatMessagePreview = (message) => {
  if (!message) return null;

  const previews = {
    TEXT: message.body ?? "",
    VOICE: "🎙 Voice message",
    PHOTO: "📷 Photo",
    CONTACT: "📞 Contact shared",
    SYSTEM: message.body ?? "",
  };

  return {
    id: message.id,
    type: message.type,
    preview: previews[message.type] ?? "",
    senderId: message.senderId,
    readAt: message.readAt,
    createdAt: message.createdAt,
  };
};

/**
 * Format a full message for socket broadcast or REST response.
 * contactValue is included here — it's the receiver's job to store/display it.
 */
export const formatMessage = (message) => {
  if (message.type === "SYSTEM") {
    return {
      id: message.id,
      conversationId: message.conversationId,
      type: "SYSTEM",
      body: message.body,
      createdAt: message.createdAt,
    };
  }

  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderName: message.sender?.profile?.identity?.firstName ?? null,
    type: message.type,
    body: message.body ?? null,
    voiceUrl: message.voiceUrl ?? null,
    voiceDuration: message.voiceDuration ?? null,
    photoUrl: message.photoUrl ?? null,
    contactValue: message.contactValue ?? null,
    readAt: message.readAt ?? null,
    createdAt: message.createdAt,
  };
};

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/**
 * Resolve the viewer's participant role (A or B) and throw if they are not
 * a participant in this conversation.
 */
const assertParticipant = (conversation, userId) => {
  const role = conversationDb.resolveParticipantRole(conversation, userId);
  if (!role) {
    throw new ForbiddenError("You are not a participant in this conversation");
  }
  return role;
};

/**
 * Throw if the conversation's current stage does not allow this message type.
 */
const assertStageAllowsMessageType = (conversation, type) => {
  const required = MESSAGE_STAGE_REQUIREMENT[type];
  if (required === undefined) {
    throw new BadRequestError(`Unknown message type: ${type}`);
  }
  if (conversation.stage < required) {
    const meta = STAGE_META[required];
    throw new BadRequestError(
      `Unlock ${meta.label} first to send this type of message`,
    );
  }
};

/**
 * Throw if the user has already paid for this stage unlock on this conversation.
 */
const assertNotAlreadyUnlocked = (conversation, role, targetStage) => {
  const flagField = `user${role}Stage${targetStage}`;
  if (conversation[flagField] === true) {
    throw new BadRequestError(
      `You have already paid to unlock stage ${targetStage}`,
    );
  }
};

/**
 * Throw if targetStage is not the next stage to unlock.
 * Users must unlock stages in order — can't skip from 1 to 3.
 */
const assertSequentialUnlock = (conversation, targetStage) => {
  if (targetStage !== conversation.stage + 1) {
    throw new BadRequestError(
      `You must unlock stage ${conversation.stage + 1} next`,
    );
  }
};

// ---------------------------------------------------------------------------
// Unlock flag helpers
// ---------------------------------------------------------------------------

const buildMyUnlocks = (conversation, role) => ({
  stage2: conversation[`user${role}Stage2`] ?? false,
  stage3: conversation[`user${role}Stage3`] ?? false,
  stage4: conversation[`user${role}Stage4`] ?? false,
  stage5: conversation[`user${role}Stage5`] ?? false,
});

const buildPartnerUnlocks = (conversation, partnerRole) => ({
  stage2: conversation[`user${partnerRole}Stage2`] ?? false,
  stage3: conversation[`user${partnerRole}Stage3`] ?? false,
  stage4: conversation[`user${partnerRole}Stage4`] ?? false,
  stage5: conversation[`user${partnerRole}Stage5`] ?? false,
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * GET /conversations
 * Returns all conversations for the viewer, formatted for ChatsList.
 */
export const getConversations = async (userId) => {
  const conversations = await conversationDb.findAllForUser(userId);
  return conversations.map((c) => formatConversationForList(c, userId));
};

/**
 * GET /conversations/:conversationId
 * Returns conversation metadata + first page of messages (newest-first).
 * Also marks any unread messages as read (mirrors socket join behaviour).
 * Pass ?cursor=<messageId> for older pages.
 */
export const getConversation = async (
  conversationId,
  userId,
  cursor = null,
) => {
  const conversation = await conversationDb.findById(conversationId);

  if (!conversation) {
    throw new NotFoundException("Conversation not found");
  }

  const role = assertParticipant(conversation, userId);
  const partnerRole = role === "A" ? "B" : "A";

  await blockService.assertConversationNotBlocked(conversation);

  // FIX (Bug 5): Mark messages read on REST open, same as socket join, so
  // unread state stays consistent regardless of which path the client uses.
  const readResult = await conversationDb.markMessagesRead(
    conversationId,
    userId,
  );

  if (readResult.count > 0) {
    eventBus.emit(EVENT_TYPES.CONVERSATION_READ, {
      conversationId,
      readBy: userId,
      readAt: new Date().toISOString(),
    });
  }

  const [messages, unlockHistory] = await Promise.all([
    conversationDb.findMessages({ conversationId, cursor, limit: 30 }),
    conversationDb.findUnlockHistory(conversationId),
  ]);

  const myUnlocks = buildMyUnlocks(conversation, role);
  const partnerUnlocks = buildPartnerUnlocks(conversation, partnerRole);

  const nextStage = conversation.stage + 1;
  const partnerReady =
    nextStage <= 5 ? (partnerUnlocks[`stage${nextStage}`] ?? false) : false;

  return {
    id: conversation.id,
    matchId: conversation.matchId,
    stage: conversation.stage,
    stageStartedAt: conversation.stageStartedAt,
    lastActivityAt: conversation.lastActivityAt,
    myUnlocks,
    partnerUnlocks,
    partnerReady,
    unlockHistory,
    messages: messages.map(formatMessage).reverse(),
    nextCursor:
      messages.length === 30 ? messages[messages.length - 1].id : null,
  };
};

/**
 * POST /conversations/:conversationId/unlock
 * Body: { targetStage: 2|3|4|5 }
 *
 * Debits coins, flips the user's flag, and advances the stage if both paid.
 * STAGE_UNLOCK_PAID fires after a successful payment (regardless of whether
 * the stage advanced). STAGE_UNLOCKED fires only when both sides have paid.
 */
export const unlockStage = async (conversationId, userId, targetStage) => {
  if (![2, 3, 4, 5].includes(targetStage)) {
    throw new BadRequestError("targetStage must be 2, 3, 4, or 5");
  }

  const meta = STAGE_META[targetStage];
  const price = getPrice(meta.priceKey);

  const result = await prisma.$transaction(async (trx) => {
    const conversation = await conversationDb.findById(conversationId, trx);

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const role = assertParticipant(conversation, userId);

    assertSequentialUnlock(conversation, targetStage);

    assertNotAlreadyUnlocked(conversation, role, targetStage);

    // FIX (Bug 1): was calling bare `assertConversationNotBlocked` which does
    // not exist in this scope — must go through blockService.
    await blockService.assertConversationNotBlocked(conversation);

    await walletService.debitCoins({
      userId,
      amount: price.amount,
      reason: price.action,
      description: price.description,
      metadata: {
        conversationId,
        targetStage,
      },
      trx,
    });

    await conversationDb.createUnlockRecord(
      {
        conversationId,
        userId,
        stage: targetStage,
      },
      trx,
    );

    const unlockResult = await conversationDb.applyStageUnlock(
      {
        conversationId,
        role,
        targetStage,
      },
      trx,
    );

    return {
      ...unlockResult,
      role,
    };
  });

  // Fires after a successful payment to notify the partner that this user
  // has paid and is waiting. Renamed from STAGE_UNLOCK_REQUESTED to clarify
  // it represents a completed payment, not an incoming request.
  eventBus.emit(EVENT_TYPES.STAGE_UNLOCK_PAID, {
    conversationId,
    targetStage,
    userId,
  });

  if (result.didAdvance) {
    eventBus.emit(EVENT_TYPES.STAGE_UNLOCKED, {
      conversationId,
      stage: result.conversation.stage,
      unlockedStage: result.unlockedStage,
    });
  }

  return {
    stage: result.conversation.stage,
    didAdvance: result.didAdvance,
    unlockedStage: result.unlockedStage,
    myUnlocks: buildMyUnlocks(result.conversation, result.role),
  };
};

/**
 * Called by the Socket.IO join_conversation handler.
 * Validates access, joins the socket room, and marks unread messages as read.
 */
export const joinConversation = async (conversationId, userId) => {
  const conversation = await conversationDb.findById(conversationId);

  if (!conversation) {
    throw new NotFoundException("Conversation not found");
  }

  assertParticipant(conversation, userId);

  // FIX (Bug 1): was calling bare `assertConversationNotBlocked` which does
  // not exist in this scope — must go through blockService.
  await blockService.assertConversationNotBlocked(conversation);

  const result = await conversationDb.markMessagesRead(conversationId, userId);

  if (result.count > 0) {
    eventBus.emit(EVENT_TYPES.CONVERSATION_READ, {
      conversationId,
      readBy: userId,
      readAt: new Date().toISOString(),
    });
  }

  return conversation;
};

/**
 * Called by the Socket.IO send_message handler.
 * Validates the message type against the conversation stage, then persists.
 *
 * For CONTACT messages: ignores any contactValue from the client and looks up
 * the sender's phone number server-side.
 */
export const sendMessage = async (
  conversationId,
  senderId,
  { type, body, voiceUrl, voiceDuration, photoUrl },
) => {
  // FIX (Bug 3): guard conversation existence before validating message type
  // so the client always gets the most accurate error for the actual failure.
  const conversation = await conversationDb.findById(conversationId);

  if (!conversation) {
    throw new NotFoundException("Conversation not found");
  }

  if (!VALID_MESSAGE_TYPES.includes(type)) {
    throw new BadRequestError("Invalid message type");
  }

  assertParticipant(conversation, senderId);

  assertStageAllowsMessageType(conversation, type);

  await blockService.assertConversationNotBlocked(conversation);

  if (type === "TEXT" && !body?.trim()) {
    throw new BadRequestError("Message body is required");
  }

  if (type === "VOICE" && !voiceUrl) {
    throw new BadRequestError("voiceUrl is required");
  }

  if (type === "PHOTO" && !photoUrl) {
    throw new BadRequestError("photoUrl is required");
  }

  let contactValue = null;

  if (type === "CONTACT") {
    const sender = await findPhoneById(senderId);

    contactValue = sender?.phone ?? null;

    if (!contactValue) {
      throw new BadRequestError("Sender phone number not found");
    }
  }

  const message = await conversationDb.createMessage({
    conversationId,
    senderId,
    type,
    body: type === "TEXT" ? body.trim() : null,
    voiceUrl: type === "VOICE" ? voiceUrl : null,
    voiceDuration: type === "VOICE" ? (voiceDuration ?? null) : null,
    photoUrl: type === "PHOTO" ? photoUrl : null,
    contactValue,
  });

  const formatted = formatMessage(message);

  eventBus.emit(EVENT_TYPES.MESSAGE_SENT, {
    conversationId,
    senderId,
    message: formatted,
  });

  return formatted;
};

/**
 * Called by the Socket.IO mark_read handler.
 * Marks all unread messages from the other participant as read.
 */
export const markRead = async (conversationId, userId) => {
  const conversation = await conversationDb.findById(conversationId);

  if (!conversation) {
    throw new NotFoundException("Conversation not found");
  }

  assertParticipant(conversation, userId);

  // FIX (Bug 2): was calling markMessagesRead twice — the first call's result
  // was discarded and the write hit the DB a second time unnecessarily.
  const result = await conversationDb.markMessagesRead(conversationId, userId);

  if (result.count > 0) {
    eventBus.emit(EVENT_TYPES.CONVERSATION_READ, {
      conversationId,
      readBy: userId,
      readAt: new Date().toISOString(),
    });
  }
};

/**
 * Called by the MATCH_CREATED event listener.
 * Creates the Conversation record and posts the opening system message.
 */
export const createConversationForMatch = async (matchId) => {
  const conversation = await conversationDb.createForMatch(matchId);

  const systemMsg = await conversationDb.createSystemMessage({
    conversationId: conversation.id,
    body: "You matched ❤️",
  });

  return { conversation, systemMessage: formatMessage(systemMsg) };
};

export const blockConversation = async (
  conversationId,
  blockerId,
  reason = null,
) => {
  const result = await blockService.blockConversationUser(
    conversationId,
    blockerId,
    reason,
  );

  eventBus.emit(EVENT_TYPES.CONVERSATION_BLOCKED, {
    conversationId,
    blockerId,
    blockedId: result.blockedId,
  });

  return result;
};
