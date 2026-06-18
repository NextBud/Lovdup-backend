import prisma from "../../../config/prisma.js";

const dbClient = (trx) => trx || prisma;

export const withTransaction = (fn) => prisma.$transaction(fn);

export const findUserById = async (userId, trx = null) => {
  return dbClient(trx).user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      isActive: true,
      isSuspended: true,
      profile: { select: { id: true, firstName: true, lastName: true } },
    },
  });
};


export const findRequestBetweenUsers = async ({
  senderId,
  receiverId,
  trx = null,
}) => {
  return dbClient(trx).matchRequest.findUnique({
    where: { senderId_receiverId: { senderId, receiverId } },
  });
};

export const createRequest = async (payload, trx = null) => {
  return dbClient(trx).matchRequest.create({ data: payload });
};

export const findById = async (requestId, trx = null) => {
  return dbClient(trx).matchRequest.findUnique({
    where: { id: requestId },
    include: {
      sender: {
        include: {
          profile: {
            include: {
              identity: true,
              lifestyle: true,
              values: true,
              narrative: true,
            }
          },
          profilePhotos: {
            where: { status: "ACTIVE" },
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          },
          voiceAnswers: {
            where: { status: "ACTIVE" },
            include: { voicePrompt: true },
          },
        },
      },
      receiver: {
        include: {
          profile: {
            include: {
              identity: true,
              lifestyle: true,
              values: true,
              narrative: true,
            }
          },
          profilePhotos: {
            where: { status: "ACTIVE" },
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          },
          voiceAnswers: {
            where: { status: "ACTIVE" },
            include: { voicePrompt: true },
          },
        },
      },
    },
  });
};

export const updateStatus = async ({
  requestId,
  status,
  respondedAt = new Date(),
  trx = null,
}) => {
  return dbClient(trx).matchRequest.update({
    where: { id: requestId },
    data: { status, respondedAt },
  });
};

export const findSentRequests = async ({ userId, trx = null }) => {
  return dbClient(trx).matchRequest.findMany({
    where: { senderId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      receiver: {
        select: {
          id: true,
          profile: true,
          profilePhotos: {
            where: { status: "ACTIVE" },
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          },
        },
      },
    },
  });
};

export const findReceivedRequests = async ({ userId, trx = null }) => {
  return dbClient(trx).matchRequest.findMany({
    where: { receiverId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: {
          id: true,
          profile: true,
          profilePhotos: {
            where: { status: "ACTIVE" },
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          },
        },
      },
    },
  });
};

// ---------------------------------------------------------------------------
// Composite transactional operations
// ---------------------------------------------------------------------------

export const createRequestWithAutoMatch = async ({
  senderId,
  receiverId,
  requestPayload,
  reverseRequestId, // pass if a reverse PENDING request exists
  debitCoins, // async fn(trx) — wallet debit, injected from service
  createMatch, // async fn({ userAId, userBId }, trx) — injected from matchDb
  normalizePair, // fn(a, b) => [a, b] sorted
}) => {
  return prisma.$transaction(async (trx) => {
    await debitCoins(trx);

    const createdRequest = await createRequest(requestPayload, trx);

    let match = null;

    if (reverseRequestId) {
      await updateStatus({
        requestId: reverseRequestId,
        status: "ACCEPTED",
        trx,
      });
      await updateStatus({
        requestId: createdRequest.id,
        status: "ACCEPTED",
        trx,
      });

      const [userAId, userBId] = normalizePair(senderId, receiverId);
      match = await createMatch({ userAId, userBId }, trx);
    }

    return { createdRequest, match };
  });
};

export const respondToRequest = async ({
  requestId,
  status,
  createMatch, // async fn({ userAId, userBId }, trx)
  normalizePair, // fn(a, b) => [a, b] sorted
  senderId,
  receiverId,
}) => {
  return prisma.$transaction(async (trx) => {
    const handledRequest = await updateStatus({ requestId, status, trx });

    let match = null;

    if (status === "ACCEPTED") {
      const [userAId, userBId] = normalizePair(senderId, receiverId);
      match = await createMatch({ userAId, userBId }, trx);
    }

    return { handledRequest, match };
  });
};

            // export const findById = async (requestId, trx = null) => {
            //   return dbClient(trx).matchRequest.findUnique({
            //     where: { id: requestId },
            //     include: {
            //       sender: {
            //         include: {
            //           profile: {
            //             include: {
            //               identity: true,
            //               lifestyle: true,
            //               values: true,
            //               narrative: true,
            //             }
            //           },
            //           profilePhotos: {
            //             where: { status: "ACTIVE" },
            //             orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            //           },
            //           voiceAnswers: {
            //             where: { status: "ACTIVE" },
            //             include: { voicePrompt: true },
            //           },
            //         },
            //       },
            //       receiver: {
            //         include: {
            //           profile: {
            //             include: {
            //               identity: true,
            //               lifestyle: true,
            //               values: true,
            //               narrative: true,
            //             }
            //           },
            //           profilePhotos: {
            //             where: { status: "ACTIVE" },
            //             orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            //           },
            //           voiceAnswers: {
            //             where: { status: "ACTIVE" },
            //             include: { voicePrompt: true },
            //           },
            //         },
            //       },
            //     },
            //   });
            // };