import express from "express";
import {
  createMatchRequest,
  getSentMatchRequests,
  getReceivedMatchRequests,
  respondToMatchRequest,
} from "./matchRequest.controller.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { validateBody } from "../../../middlewares/validator/validator.js";
import {
  createMatchRequestSchema,
  respondToMatchRequestSchema,
} from "./matchRequest.validation.js";

const matchRequestRouter = express.Router();

matchRequestRouter.use(authMiddleware);

matchRequestRouter.post("/", validateBody(createMatchRequestSchema), createMatchRequest);

matchRequestRouter.get("/sent", getSentMatchRequests);
matchRequestRouter.get("/received", getReceivedMatchRequests);

matchRequestRouter.patch(
  "/:requestId/respond",
  validateBody(respondToMatchRequestSchema),
  respondToMatchRequest,
);

export default matchRequestRouter;
