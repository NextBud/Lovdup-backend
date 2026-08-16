import express from "express";
import {
  requestDiscoveryMatches,
  getLatestDiscoveryMatches,
} from "./discovery.controller.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";

const discoveryRouter = express.Router();

discoveryRouter.use(authMiddleware);

discoveryRouter.get("/latest", getLatestDiscoveryMatches);
discoveryRouter.post("/request", requestDiscoveryMatches);

export default discoveryRouter;
