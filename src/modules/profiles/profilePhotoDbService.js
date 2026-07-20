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

export const findPhotosByProfileId = async (
  { profileId, status = null, onlyPrimary = false },
  tx = null,
) => {
  const db = dbClient(tx);

  const where = { profileId };
  if (status) {
    where.status = status;
  }

  return db.profilePhoto.findMany({
    where,
    orderBy: [
      { isPrimary: "desc" },
      { position: "asc" },
      { createdAt: "desc" },
    ],
    ...(onlyPrimary && { take: 1 }),
  });
};

export const findPhotoById = async (photoId, tx = null) => {
  const db = dbClient(tx);

  return db.profilePhoto.findUnique({
    where: { id: photoId },
  });
};

export const findPrimaryPhotoByProfileId = async (
  profileId,
  status = "ACTIVE",
  tx = null,
) => {
  const db = dbClient(tx);

  return db.profilePhoto.findFirst({
    where: {
      profileId,
      status,
      isPrimary: true,
    },
  });
};
