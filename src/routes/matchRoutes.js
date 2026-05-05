import express from "express";
import { getMyMatches, unmatch } from "./match.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getMyMatches);
router.patch("/:matchId/unmatch", unmatch);

export default router;
