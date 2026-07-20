import { eventBus } from "../eventBus.js";

export const safeListener = (eventName, handler) => {
  eventBus.on(eventName, async (payload) => {
    try {
      await handler(payload);
    } catch (error) {
      console.error(`[${eventName}]`, error);
    }
  });
};