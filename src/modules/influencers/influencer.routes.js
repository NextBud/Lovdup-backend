import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import * as controller from "./influencer.controller.js";

const influencerRouter = Router();

influencerRouter.use(authMiddleware);

influencerRouter.get("/dashboard", controller.getDashboard);
influencerRouter.get("/referral-code", controller.getReferralCode);
influencerRouter.get("/referrals", controller.getReferrals);
influencerRouter.get("/earnings", controller.getEarnings);

export default influencerRouter;
