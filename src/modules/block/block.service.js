import * as conversationDb from "../converstaions/conversation.db.js";
import * as blockDb from "./block.db.js";

export const blockConversationUser = async (
  conversationId,
  blockerId,
  reason = null,
) => {
  const conversation = await conversationDb.findById(conversationId);

  if (!conversation) {
    throw new NotFoundError("Conversation not found");
  }

  const isParticipant =
    conversation.userAId === blockerId || conversation.userBId === blockerId;

  if (!isParticipant) {
    throw new ForbiddenError("You are not a participant in this conversation");
  }

  const existing = await blockDb.findByUsers(blockerId, blockedId);

  if (existing) {
    return {
      blockedId,
      alreadyBlocked: true,
    };
  }

  const blockedId =
    conversation.userAId === blockerId
      ? conversation.userBId
      : conversation.userAId;

  await blockDb.create({
    blockerId,
    blockedId,
    reason,
  });

  return {
    conversationId,
    blockerId,
    blockedId,
  };
};
