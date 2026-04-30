import multer from "multer";
import { BadRequestError } from "../lib/classes/errorClasses.js";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "audio/mpeg",
    "audio/wav",
    "audio/webm",
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new BadRequestError("Unsupported file type"), false);
  }

  cb(null, true);
};

export const uploadOnboardingMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export const handleOnboardingPhotoUpload = uploadOnboardingMedia.array(
  "photos",
  4,
);

export const handleOnboardingVoiceUpload = uploadOnboardingMedia.array(
  "voices",
  5,
);