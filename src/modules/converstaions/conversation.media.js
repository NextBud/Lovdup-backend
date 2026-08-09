import * as conversationDb from "./conversation.db.js";

import {
  assertParticipant,
  assertStageAllowsMessageType,
} from "./conversation.service.js";

import { processMediaUploads } from "../../middlewares/processMediaUploads.js";

import {
  NotFoundException,
  BadRequestError,
} from "../../classes/errorClasses.js";

const MEDIA_TYPE_BY_MESSAGE_TYPE = {
  VOICE: "audio",
  PHOTO: "image",
};

const uploadConversationMedia = async (
  conversationId,
  userId,
  messageType,
  file,
) => {
  if (!file) {
    throw new BadRequestError("No file uploaded");
  }

  const conversation = await conversationDb.findById(conversationId);

  if (!conversation) {
    throw new NotFoundException("Conversation not found");
  }

  assertParticipant(conversation, userId);

  await assertStageAllowsMessageType(conversation, messageType);

  const mediaType = MEDIA_TYPE_BY_MESSAGE_TYPE[messageType];

  if (!mediaType) {
    throw new BadRequestError(`Unsupported media message type: ${messageType}`);
  }

  const [uploaded] = await processMediaUploads({
    files: [file],
    folder: `conversations/${conversationId}`,
    mediaType,
  });

  return {
    url: uploaded.url,
  };
};

export const uploadVoice = (conversationId, userId, file) =>
  uploadConversationMedia(conversationId, userId, "VOICE", file);

export const uploadPhoto = (conversationId, userId, file) =>
  uploadConversationMedia(conversationId, userId, "PHOTO", file);
