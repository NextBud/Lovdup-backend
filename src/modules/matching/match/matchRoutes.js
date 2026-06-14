import express from "express";
import { getMyMatches, unmatch } from "./match.controller.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";

const matchRouter = express.Router();

matchRouter.use(authMiddleware);

matchRouter.get("/", getMyMatches);
matchRouter.patch("/:matchId/unmatch", unmatch);

export default matchRouter;
