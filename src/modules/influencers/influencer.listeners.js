import { EVENT_TYPES } from "../../events/eventTypes.js";
import { safeListener } from "../../events/helpers/registerListener.js";
import * as earningService from "./influencerEarning.service.js";
import * as referralService from "./influencerReferral.service.js";

let registered = false;

export const registerInfluencerListeners = () => {
  if (registered) return;
  registered = true;

  // Listen for coin purchase completions
  safeListener(EVENT_TYPES.COIN_PURCHASE_COMPLETED, async ({ purchaseId }) => {
    await earningService.processPurchaseForInfluencer(purchaseId);
  });

  // Listen for user onboarding completion to qualify referrals
  safeListener(EVENT_TYPES.USER_ONBOARDING_COMPLETED, async ({ userId }) => {
    await referralService.qualifyInfluencerReferral(userId);
  });
};
