import { EVENT_TYPES } from "../../events/eventTypes.js";
import { safeListener } from "../../events/helpers/registerListener.js";
import * as qualificationService from "./referralQualification.service.js";
import * as rewardService from "./reward.service.js";

let registered = false;

export const registerReferralListeners = () => {
  if (registered) return;
  registered = true;

  // Listen for user onboarding completion
  safeListener(EVENT_TYPES.USER_ONBOARDING_COMPLETED, async ({ userId }) => {
    console.log(
      `[Referral] Processing referral qualification for user ${userId}`,
    );
    await qualificationService.qualifyReferral(userId);
  });

  // Listen for referral qualification
  safeListener(EVENT_TYPES.REFERRAL_QUALIFIED, async ({ referralId }) => {
    console.log(`[Referral] Issuing reward for referral ${referralId}`);
    await rewardService.issueReward(referralId);
  });
};
