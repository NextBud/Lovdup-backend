export const PRICING_ACTIONS = {
  REQUEST_NEW_MATCHES: "REQUEST_NEW_MATCHES",

  START_STAGE_1: "START_STAGE_1",

  START_STAGE_2: "START_STAGE_2",
  START_STAGE_3: "START_STAGE_3",
  START_STAGE_4: "START_STAGE_4",

  UNLOCK_STAGE_5: "UNLOCK_STAGE_5",

  COMPLIMENT_PICTURE: "COMPLIMENT_PICTURE",
};

export const pricingConfig = {
  matching: {
    discovery: {
      action: PRICING_ACTIONS.REQUEST_NEW_MATCHES,
      amount: 2,
      description: "New AI matches requested",
    },

    stageOneRequest: {
      action: PRICING_ACTIONS.START_STAGE_1,
      amount: 5,
      description: "Started Stage 1 connection request",
    },

    complimentPicture: {
      action: PRICING_ACTIONS.COMPLIMENT_PICTURE,
      amount: 2,
      description: "Complimented profile picture",
    },
  },

  conversation: {
    unlockStage2: {
      action: PRICING_ACTIONS.START_STAGE_2,
      amount: 10,
      description: "Unlocked voice messages",
    },

    unlockStage3: {
      action: PRICING_ACTIONS.START_STAGE_3,
      amount: 15,
      description: "Unlocked photo sharing",
    },

    unlockStage4: {
      action: PRICING_ACTIONS.START_STAGE_4,
      amount: 20,
      description: "Unlocked video calls",
    },

    unlockStage5: {
      action: PRICING_ACTIONS.UNLOCK_STAGE_5,
      amount: 25,
      description: "Unlocked contact sharing",
    },
  },
};