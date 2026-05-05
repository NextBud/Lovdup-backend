import express from "express";
import {
  createMatchRequest,
  getSentMatchRequests,
  getReceivedMatchRequests,
  respondToMatchRequest,
} from "./matchRequest.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../middlewares/validatorMiddleware.js";
import {
  createMatchRequestSchema,
  respondToMatchRequestSchema,
} from "./matchRequest.validation.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", validateBody(createMatchRequestSchema), createMatchRequest);

router.get("/sent", getSentMatchRequests);
router.get("/received", getReceivedMatchRequests);

router.patch(
  "/:requestId/respond",
  validateBody(respondToMatchRequestSchema),
  respondToMatchRequest,
);

export default router;
