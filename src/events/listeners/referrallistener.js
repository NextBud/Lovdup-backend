import { EVENT_TYPES } from "../../events/eventTypes.js";
import { safeListener } from "../../events/helpers/registerListener.js";
import * as qualificationService from "./referralQualification.service.js";
import * as rewardService from "./reward.service.js";

let registered = false;

export const registerReferralListeners = () => {
  if (registered) return;
  registered = true;

  safeListener(EVENT_TYPES.USER_ONBOARDING_COMPLETED, async ({ userId }) => {
    await qualificationService.qualifyReferral(userId);
  });

  safeListener(EVENT_TYPES.REFERRAL_QUALIFIED, async ({ referralId }) => {
    await rewardService.issueReward(referralId);
  });
};
