import { eventBus } from "../../events/eventBus.js";
import { EVENT_TYPES } from "../../events/eventTypes.js";

export const emitReferralClicked = (payload) => {
  eventBus.emit(EVENT_TYPES.REFERRAL_CLICKED, payload);
};

export const emitReferralCreated = (payload) => {
  eventBus.emit(EVENT_TYPES.REFERRAL_CREATED, payload);
};

export const emitReferralQualified = (payload) => {
  eventBus.emit(EVENT_TYPES.REFERRAL_QUALIFIED, payload);
};

export const emitReferralRejected = (payload) => {
  eventBus.emit(EVENT_TYPES.REFERRAL_REJECTED, payload);
};

export const emitReferralRewarded = (payload) => {
  eventBus.emit(EVENT_TYPES.REFERRAL_REWARDED, payload);
};
