export const PRICING_ACTIONS = {
  REQUEST_NEW_MATCHES: "REQUEST_NEW_MATCHES",
  START_STAGE_1: "START_STAGE_1",
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
};