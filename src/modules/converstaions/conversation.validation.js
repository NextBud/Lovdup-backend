import Joi from "joi";

export const sendMessageSchema = Joi.object({
  type: Joi.string().valid("TEXT", "VOICE", "PHOTO", "CONTACT").required(),

  body: Joi.string().allow("", null),

  voiceUrl: Joi.string().uri().allow(null),

  voiceDuration: Joi.number().integer().allow(null),

  photoUrl: Joi.string().uri().allow(null),
});
