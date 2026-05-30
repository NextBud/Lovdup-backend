import cloudinary from "../config/cloudinary.js";
import { BadRequestError } from "../classes/errorClasses.js";

const uploadBufferToCloudinary = (file, folder, resourceType = "auto") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    stream.end(file.buffer);
  });
};

export const processMediaUploads = async ({
  files = [],
  folder = "onboarding",
  mediaType = "image",
}) => {
  if (!files.length) {
    throw new BadRequestError("No files uploaded");
  }

  const resourceType = mediaType === "audio" ? "video" : "image";

  const uploads = await Promise.all(
    files.map(async (file) => {
      const result = await uploadBufferToCloudinary(file, folder, resourceType);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        mimeType: file.mimetype,
        size: file.size,
        mediaType,
      };
    }),
  );

  return uploads;
};
