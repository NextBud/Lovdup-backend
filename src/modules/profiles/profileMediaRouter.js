import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  getUserPhotos,
  getMyPhotos,
  getPhotoById,
  getPrimaryPhoto,
  getUserVoiceAnswers,
  getMyVoiceAnswers,
  getVoiceAnswerById,
  getUserMedia,
  getMyMedia,
} from "./profileMediaController.js";

const profileMediaRouter = express.Router();

// All routes require authentication
profileMediaRouter.use(authMiddleware);

// ---------------------------------------------------------------------------
// Photo Routes
// ---------------------------------------------------------------------------

// Get authenticated user's photos
profileMediaRouter.get("/me/photos", getMyPhotos);

// Get photos for a specific user
profileMediaRouter.get("/:userId/photos", getUserPhotos);

// Get primary photo for a user
profileMediaRouter.get("/:userId/primary-photo", getPrimaryPhoto);

// Get a specific photo by ID
profileMediaRouter.get("/photos/:photoId", getPhotoById);

// ---------------------------------------------------------------------------
// Voice Answer Routes
// ---------------------------------------------------------------------------

// Get authenticated user's voice answers
profileMediaRouter.get("/me/voice", getMyVoiceAnswers);

// Get voice answers for a specific user
profileMediaRouter.get("/:userId/voice", getUserVoiceAnswers);

// Get a specific voice answer by ID
profileMediaRouter.get("/voice/:voiceAnswerId", getVoiceAnswerById);

// ---------------------------------------------------------------------------
// Combined Media Routes
// ---------------------------------------------------------------------------

// Get authenticated user's media (combined)
profileMediaRouter.get("/me/media", getMyMedia);

// Get combined media for a specific user
profileMediaRouter.get("/:userId/media", getUserMedia);

export default profileMediaRouter;
