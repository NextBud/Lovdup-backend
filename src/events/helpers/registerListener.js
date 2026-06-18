import { eventBus } from "../eventBus.js";

export const safeListener = (eventName, handler) => {
  eventBus.on(eventName, (payload) => {
    try {
      handler(payload);
    } catch (error) {
      console.error(
        `[ConversationListener] ${eventName}`,
        error,
      );
    }
  });
};