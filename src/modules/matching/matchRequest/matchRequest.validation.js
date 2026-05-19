import Joi from "joi";

export const createMatchRequestSchema = Joi.object({
  receiverId: Joi.string().uuid().required(),

  type: Joi.string().valid("LIKE", "SUPER_LIKE").default("LIKE"),

  message: Joi.string().trim().min(10).max(300).allow(null, "").optional(),

  voiceNoteUrl: Joi.string().uri().allow(null, "").optional(),
}).custom((value, helpers) => {
  const hasMessage = value.message && value.message.trim().length >= 10;
  const hasVoice = value.voiceNoteUrl && value.voiceNoteUrl.trim().length > 0;

  if (!hasMessage && !hasVoice) {
    return helpers.error("any.custom", {
      message: "Either message or voice note is required",
    });
  }

  return value;
});

export const respondToMatchRequestSchema = Joi.object({
  status: Joi.string().valid("ACCEPTED", "REJECTED").required(),
});
