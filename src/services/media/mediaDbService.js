import prisma from "../config/prisma.js";

export const createManyMedia = async (mediaItems, tx = prisma) => {
  return Promise.all(
    mediaItems.map((item) =>
      tx.media.create({
        data: item,
      }),
    ),
  );
};
