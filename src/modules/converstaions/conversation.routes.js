import { Router } from "express";
import * as conversationController from "./conversation.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js"; 


const conversationRouter = Router();

conversationRouter.get("/", authMiddleware, conversationController.getConversations);

conversationRouter.get(
  "/:conversationId",
  authMiddleware,
  conversationController.getConversation,
);

conversationRouter.post(
  "/:conversationId/messages",
  authMiddleware,
  conversationController.sendMessage,
);

conversationRouter.post(
  "/:conversationId/unlock",
  authMiddleware,
  conversationController.unlockStage,
);

conversationRouter.post(
  "/:conversationId/block",
  authMiddleware,
  conversationController.blockConversation,
);

export default conversationRouter;
