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

// RECONCILED: previously CONTACT/stage-4 and stage-5 disagreed across files
// (contracts.js and db.js already treated 5 as the contact stage; this file
// and conversation.stage.js still said 4). Stage 4's real label is a
// placeholder pending confirmation — see conversation.stage.js TODO.
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
    label: "deeper conversation",
    priceKey: "conversation.unlockStage4",
  },

  5: {
    label: "contact exchange",
    priceKey: "conversation.unlockStage5",
  },
};

// RECONCILED: CONTACT removed from sendable types. Per prior work, contact
// info is revealed passively once both sides unlock stage 5 (see
// applyStageUnlock in conversation.db.js), not sent as a message. Surfaced
// instead via getConversation's `partnerContact` field below.
const VALID_MESSAGE_TYPES = ["TEXT", "VOICE", "PHOTO"];

// Minimum stage required to send each message type.
const MESSAGE_STAGE_REQUIREMENT = {
  TEXT: 1,
  VOICE: 2,
  PHOTO: 3,
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
 *
 * Exported so conversation.media.js can run the same check before an
 * upload instead of duplicating it.
 */
export const assertParticipant = (conversation, userId) => {
  const role = conversationDb.resolveParticipantRole(conversation, userId);
  if (!role) {
    throw new ForbiddenError("You are not a participant in this conversation");
  }
  return role;
};

/**
 * Throw if the conversation's current stage does not allow this message type.
 *
 * Exported so conversation.media.js can gate uploads by stage before
 * spending a Cloudinary call on a request that would be rejected anyway.
 */
export const assertStageAllowsMessageType = (conversation, type) => {
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

  // RECONCILED: contact is no longer a message type you "send" — once both
  // sides have unlocked stage 5, the partner's contact value is surfaced
  // here passively instead.
  let partnerContact = null;
  if (conversation.contactRevealed) {
    const partnerId =
      role === "A" ? conversation.userBId : conversation.userAId;
    const partner = await findPhoneById(partnerId);
    partnerContact = partner?.phone ?? null;
  }

  return {
    id: conversation.id,
    matchId: conversation.matchId,
    stage: conversation.stage,
    stageStartedAt: conversation.stageStartedAt,
    lastActivityAt: conversation.lastActivityAt,
    myUnlocks,
    partnerUnlocks,
    partnerReady,
    contactRevealed: conversation.contactRevealed,
    partnerContact,
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

  const conversation = await conversationDb.findById(conversationId);

  if (!conversation) {
    throw new NotFoundException("Conversation not found");
  }

  const role = assertParticipant(conversation, userId);

  assertSequentialUnlock(conversation, targetStage);

  assertNotAlreadyUnlocked(conversation, role, targetStage);

  await blockService.assertConversationNotBlocked(conversation);

  const meta = STAGE_META[targetStage];
  const price = getPrice(meta.priceKey);

  const result = await prisma.$transaction(
    async (trx) => {
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
    },
    {
      timeout: 10000,
    },
  );

  eventBus.emit(EVENT_TYPES.STAGE_UNLOCK_REQUESTED, {
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
 * Called by the Socket.IO send_message handler (and the REST controller).
 * Validates the message type against the conversation stage, then persists.
 *
 * RECONCILED: CONTACT is no longer a sendable type. Contact reveal is now
 * passive — see getConversation's `partnerContact` field.
 */
export const sendMessage = async (
  conversationId,
  senderId,
  { type, body, voiceUrl, voiceDuration, photoUrl },
) => {
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

  const message = await conversationDb.createMessage({
    conversationId,
    senderId,
    type,
    body: type === "TEXT" ? body.trim() : null,
    voiceUrl: type === "VOICE" ? voiceUrl : null,
    voiceDuration: type === "VOICE" ? (voiceDuration ?? null) : null,
    photoUrl: type === "PHOTO" ? photoUrl : null,
    contactValue: null,
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

  const result = await conversationDb.markMessagesRead(conversationId, userId);

  if (result.count > 0) {
    eventBus.emit(EVENT_TYPES.CONVERSATION_READ, {
      conversationId,
      readBy: userId,
      readAt: new Date().toISOString(),
    });
  }

  return result;
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
