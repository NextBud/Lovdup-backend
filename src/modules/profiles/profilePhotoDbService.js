import prisma from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

export const createProfilePhotos = async (photos, tx = null) => {
  const db = dbClient(tx);

  return db.profilePhoto.createMany({
    data: photos,
    skipDuplicates: true,
  });
};

export const deleteProfilePhotosByProfileId = async (profileId, tx = null) => {
  const db = dbClient(tx);

  return db.profilePhoto.deleteMany({
    where: { profileId },
  });
};
