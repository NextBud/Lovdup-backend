import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import * as controller from "./referral.controller.js";

const referralRouter = Router();

// Public routes (no auth required)
referralRouter.get("/validate/:code", controller.validateReferralCode);

// Protected routes (auth required)
referralRouter.use(authMiddleware);

referralRouter.get("/me", controller.getMyReferral);
referralRouter.get("/me/stats", controller.getMyReferralStats);
referralRouter.get("/me/history", controller.getMyReferralHistory);
referralRouter.post("/apply", controller.applyReferralCode);
referralRouter.post("/click", controller.registerReferralClick);
referralRouter.get("/eligibility", controller.getReferralEligibility);

export default referralRouter;
