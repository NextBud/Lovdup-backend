import * as conversationService from "./conversation.service.js";
import  asyncWrapper from "../../lib/asyncWrapper.js";

export const getConversations = asyncWrapper(async (req, res) => {
  const conversations = await conversationService.getConversations(req.user.id);

  res.status(200).json({
    success: true,
    data: conversations,
  });
});

export const sendMessage = asyncWrapper(async (req, res) => {
  const message = await conversationService.sendMessage(
    req.params.conversationId,
    req.user.userId,
    req.body,
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

export const getConversation = asyncWrapper(async (req, res) => {
  const conversation = await conversationService.getConversation(
    req.params.conversationId,
    req.user.id,
    req.query.cursor,
  );

  res.status(200).json({
    success: true,
    data: conversation,
  });
});

export const unlockStage = asyncWrapper(async (req, res) => {
  const result = await conversationService.unlockStage(
    req.params.conversationId,
    req.user.id,
    req.body.targetStage,
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const blockConversation = asyncWrapper(async (req, res) => {
  const result = await conversationService.blockConversation(
    req.params.conversationId,
    req.user.id,
    req.body.reason,
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});
