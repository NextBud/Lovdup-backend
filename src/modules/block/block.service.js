import * as conversationDb from "../converstaions/conversation.db.js";
import * as blockDb from "./block.db.js";

export const assertConversationNotBlocked = async (conversation) => {
  const block = await blockDb.findBetweenUsers(
    conversation.userAId,
    conversation.userBId,
  );

  if (block) {
    throw new ForbiddenError("Conversation is blocked");
  }

  return null;
};

export const blockConversationUser = async (
  conversationId,
  blockerId,
  reason = null,
) => {
  const conversation = await conversationDb.findById(conversationId);

  if (!conversation) {
    throw new NotFoundException("Conversation not found");
  }

  const isParticipant =
    conversation.userAId === blockerId || conversation.userBId === blockerId;

  if (!isParticipant) {
    throw new ForbiddenError("You are not a participant in this conversation");
  }

  const blockedId =
    conversation.userAId === blockerId
      ? conversation.userBId
      : conversation.userAId;

  const existing = await blockDb.findBetweenUsers(blockerId, blockedId);

  if (existing) {
    return {
      conversationId,
      blockerId,
      blockedId,
      alreadyBlocked: true,
    };
  }

  await blockDb.create({
    blockerId,
    blockedId,
    reason,
  });

  return {
    conversationId,
    blockerId,
    blockedId,
    alreadyBlocked: false,
  };
};