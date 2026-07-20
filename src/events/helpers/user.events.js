import { eventBus } from "../../events/eventBus.js";
import { EVENT_TYPES } from "../../events/eventTypes.js";

export const emitUserOnboardingCompleted = (payload) => {
  eventBus.emit(EVENT_TYPES.USER_ONBOARDING_COMPLETED, payload);
};
