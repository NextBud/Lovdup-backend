import { Router } from "express";
import * as conversationController from "./conversation.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  handleConversationVoiceUpload,
  handleConversationPhotoUpload,
} from "../../middlewares/mediaUploadMiddleware.js";
import { validateBody } from "../../middlewares/validator/validator.js";
import { sendMessageSchema } from "./conversation.validation.js";



const conversationRouter = Router();

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

conversationRouter.get(
  "/",
  authMiddleware,
  conversationController.getConversations,
);

conversationRouter.get(
  "/:conversationId",
  authMiddleware,
  conversationController.getConversation,
);

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

conversationRouter.post(
  "/:conversationId/messages",
  authMiddleware,
  validateBody(sendMessageSchema),
  conversationController.sendMessage,
);

// ---------------------------------------------------------------------------
// Stage
// ---------------------------------------------------------------------------

conversationRouter.post(
  "/:conversationId/unlock",
  authMiddleware,
  conversationController.unlockStage,
);

// ---------------------------------------------------------------------------
// Blocking
// ---------------------------------------------------------------------------

conversationRouter.post(
  "/:conversationId/block",
  authMiddleware,
  conversationController.blockConversation,
);

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

conversationRouter.post(
  "/:conversationId/media/voice",
  authMiddleware,
  handleConversationVoiceUpload,
  conversationController.uploadVoiceMessage,
);

conversationRouter.post(
  "/:conversationId/media/photo",
  authMiddleware,
  handleConversationPhotoUpload,
  conversationController.uploadPhotoMessage,
);

export default conversationRouter;
