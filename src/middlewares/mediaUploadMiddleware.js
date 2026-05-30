/**
 * mediaUploadMiddleware.js
 *
 * Multer configuration for all media uploads.
 * Files are held in memory (Buffer) and passed to Cloudinary — no disk writes.
 */

import multer from "multer";
import { BadRequestError } from "../classes/errorClasses.js";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "audio/mpeg",
    "audio/wav",
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(
      new BadRequestError(`Unsupported file type: ${file.mimetype}`),
      false,
    );
  }

  cb(null, true);
};

const uploadMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
  },
});

export const handleOnboardingPhotoUpload = uploadMedia.array("photos", 4);
export const handleOnboardingVoiceUpload = uploadMedia.array("voices", 5);
