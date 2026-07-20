import { EVENT_TYPES } from "../../events/eventTypes.js";
import { safeListener } from "../../events/helpers/registerListener.js";
import * as influencerEarningService from "../influencers/influencerEarning.service.js";

let registered = false;

export const registerPurchaseListeners = () => {
  if (registered) return;
  registered = true;

  // Listen for coin purchase completions
  safeListener(EVENT_TYPES.COIN_PURCHASE_COMPLETED, async ({ purchaseId }) => {
    await influencerEarningService.processPurchaseForInfluencer(purchaseId);
  });
};
