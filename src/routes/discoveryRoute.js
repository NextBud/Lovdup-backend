import express from "express";
import {
  requestDiscoveryMatches,
  getLatestDiscoveryMatches,
} from "./discovery.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getLatestDiscoveryMatches);
router.post("/request", requestDiscoveryMatches);

export default router;
