import express from "express";
import { getMyMatches, unmatch } from "./match.controller.js";
import {
  requestDiscoveryMatches,
  getLatestDiscoveryMatches,
} from "../discovery/discovery.controller.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";

const matchRouter = express.Router();

matchRouter.use(authMiddleware);

// Established matches
matchRouter.get("/", getMyMatches);
matchRouter.patch("/:matchId/unmatch", unmatch);

// Discovery
matchRouter.post("/discover", requestDiscoveryMatches);
matchRouter.get("/discover/latest", getLatestDiscoveryMatches);

export default matchRouter;
