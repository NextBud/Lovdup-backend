import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../middlewares/validator/validator.js";
import {
  getMyProfile,
  upsertIdentity,
  upsertLifestyle,
  upsertValues,
  upsertNarrative,
  savePhotos,
  saveVoiceAnswers,
} from "./profileController.js";
import {
  upsertProfileIdentitySchema,
  upsertProfileLifestyleSchema,
  upsertProfileValuesSchema,
  upsertProfileNarrativeSchema,
  saveProfilePhotosSchema,
  saveVoiceAnswersSchema,
} from "./profile.validation.js";

const profileRouter = express.Router();

profileRouter.use(authMiddleware);

profileRouter.get("/me", getMyProfile);

profileRouter.put(
  "/identity",
  validateBody(upsertProfileIdentitySchema),
  upsertIdentity,
);
profileRouter.put(
  "/lifestyle",
  validateBody(upsertProfileLifestyleSchema),
  upsertLifestyle,
);
profileRouter.put(
  "/values",
  validateBody(upsertProfileValuesSchema),
  upsertValues,
);
profileRouter.put(
  "/narrative",
  validateBody(upsertProfileNarrativeSchema),
  upsertNarrative,
);
profileRouter.put(
  "/photos",
  validateBody(saveProfilePhotosSchema),
  savePhotos,
);
profileRouter.put(
  "/voice",
  validateBody(saveVoiceAnswersSchema),
  saveVoiceAnswers,
);

export default profileRouter;
