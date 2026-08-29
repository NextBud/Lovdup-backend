export const NOTIFICATION_TEMPLATES = {
  CONNECTION_REQUEST_RECEIVED: {
    title: "New connection request",
    body: ({ actorName }) => `${actorName} sent you a connection request.`,
  },

  CONNECTION_REQUEST_ACCEPTED: {
    title: "Connection request accepted",
    body: ({ actorName }) => `${actorName} accepted your connection request.`,
  },

  NEW_MATCH: {
    title: "It's a match!",
    body: ({ actorName }) => `You matched with ${actorName}.`,
  },

  NEW_MESSAGE: {
    title: "New message",
    body: ({ actorName }) => `${actorName} sent you a message.`,
  },

  STAGE_UNLOCKED: {
    title: "Conversation stage unlocked",
    body: ({ stage }) => `Stage ${stage} of your conversation is now unlocked.`,
  },

  PROFILE_VIEWED: {
    title: "Profile viewed",
    body: ({ actorName }) => `${actorName} viewed your profile.`,
  },

  COINS_AWARDED: {
    title: "Coins added",
    body: ({ amount }) => `${amount} coins were added to your wallet.`,
  },

  COIN_PURCHASE_COMPLETED: {
    title: "Coin purchase completed",
    body: ({ amount }) => `${amount} coins were added to your wallet.`,
  },

  REFERRAL_REWARDED: {
    title: "Referral reward",
    body: ({ amount }) =>
      amount
        ? `You received a referral reward of ${amount} coins.`
        : "You received a referral reward.",
  },

  SYSTEM: {
    title: "LovdUp",
    body: ({ message }) => message,
  },
};
