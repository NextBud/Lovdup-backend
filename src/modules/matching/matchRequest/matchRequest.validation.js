import Joi from "joi";

export const createMatchRequestSchema = Joi.object({
  receiverId: Joi.string().uuid().required(),

  type: Joi.string().valid("LIKE", "SUPER_LIKE").required(),

  message: Joi.string().trim().min(1).max(500).allow(null, "").optional(),

  voiceNoteUrl: Joi.string().uri().allow(null, "").optional(),
});

export const respondToMatchRequestSchema = Joi.object({
  status: Joi.string().valid("ACCEPTED", "REJECTED").required(),
});