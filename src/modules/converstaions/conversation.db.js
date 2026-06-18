import prisma from "../../config/prisma.js";
import { NotFoundException } from "../../classes/errorClasses.js";

const dbClient = (trx) => trx || prisma;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const resolveParticipantRole = (conversation, userId) => {
  if (conversation.userAId === userId) return "A";
  if (conversation.userBId === userId) return "B";
  return null;
};

// ---------------------------------------------------------------------------
// Conversation Reads
// ---------------------------------------------------------------------------

export const findById = async (conversationId, trx = null) => {
  return dbClient(trx).conversation.findUnique({
    where: { id: conversationId },
    include: {
      lastMessage: true,
    },
  });
};

export const findByMatchId = async (matchId, trx = null) => {
  return dbClient(trx).conversation.findUnique({
    where: { matchId },
    include: {
      match: true,
      lastMessage: true,
    },
  });
};

export const findAllForUser = async (userId, trx = null) => {
  return dbClient(trx).conversation.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: {
      match: {
        include: {
          userA: {
            select: {
              id: true,
              profile: {
                select: {
                  identity: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
              profilePhotos: {
                where: {
                  status: "ACTIVE",
                  isPrimary: true,
                },
                select: {
                  url: true,
                },
                take: 1,
              },
            },
          },
          userB: {
            select: {
              id: true,
              profile: {
                select: {
                  identity: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
              profilePhotos: {
                where: {
                  status: "ACTIVE",
                  isPrimary: true,
                },
                select: {
                  url: true,
                },
                take: 1,
              },
            },
          },
        },
      },
      lastMessage: true,
    },
    orderBy: {
      lastMessageAt: "desc",
    },
  });
};

// ---------------------------------------------------------------------------
// Message Reads
// ---------------------------------------------------------------------------

export const findMessages = async ({
  conversationId,
  cursor = null,
  limit = 30,
  trx = null,
}) => {
  return dbClient(trx).message.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    include: {
      sender: {
        select: {
          id: true,
          profile: {
            select: {
              identity: {
                select: {
                  firstName: true,
                },
              },
            },
          },
        },
      },
    },
  });
};

export const countUnread = async (conversationId, userId, trx = null) => {
  return dbClient(trx).message.count({
    where: {
      conversationId,
      senderId: {
        not: userId,
      },
      readAt: null,
    },
  });
};

// ---------------------------------------------------------------------------
// Unlock Reads
// ---------------------------------------------------------------------------

export const findUnlockHistory = async (conversationId, trx = null) => {
  return dbClient(trx).conversationUnlock.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

// ---------------------------------------------------------------------------
// Conversation Writes
// ---------------------------------------------------------------------------

export const createForMatch = async (matchId, trx = null) => {
  const db = dbClient(trx);

  const match = await db.match.findUnique({
    where: {
      id: matchId,
    },
    select: {
      userAId: true,
      userBId: true,
    },
  });

  if (!match) {
    throw new NotFoundException("Match not found");
  }

  return db.conversation.create({
    data: {
      matchId,
      userAId: match.userAId,
      userBId: match.userBId,
    },
  });
};

// ---------------------------------------------------------------------------
// Message Writes
// ---------------------------------------------------------------------------

export const createMessage = async (
  {
    conversationId,
    senderId,
    type,
    body,
    voiceUrl,
    voiceDuration,
    photoUrl,
    contactValue,
  },
  trx = null,
) => {
  const run = async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId,
        senderId,
        type,
        body: body ?? null,
        voiceUrl: voiceUrl ?? null,
        voiceDuration: voiceDuration ?? null,
        photoUrl: photoUrl ?? null,
        contactValue: contactValue ?? null,
      },
      include: {
        sender: {
          select: {
            id: true,
            profile: {
              select: {
                identity: {
                  select: {
                    firstName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    await tx.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
        lastActivityAt: message.createdAt,
      },
    });

    return message;
  };

  return trx ? run(trx) : prisma.$transaction(run);
};

export const createSystemMessage = async (
  { conversationId, body },
  trx = null,
) => {
  const run = async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId,
        senderId: null,
        type: "SYSTEM",
        body,
      },
    });

    await tx.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
        lastActivityAt: message.createdAt,
      },
    });

    return message;
  };

  return trx ? run(trx) : prisma.$transaction(run);
};

export const markMessagesRead = async (conversationId, userId, trx = null) => {
  const run = async (tx) => {
    const result = await tx.message.updateMany({
      where: {
        conversationId,
        senderId: {
          not: userId,
        },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    if (result.count > 0) {
      await tx.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          lastActivityAt: new Date(),
        },
      });
    }

    return result;
  };

  return trx ? run(trx) : prisma.$transaction(run);
};

// ---------------------------------------------------------------------------
// Unlock Writes
// ---------------------------------------------------------------------------

export const createUnlockRecord = async (
  { conversationId, userId, stage },
  trx = null,
) => {
  return dbClient(trx).conversationUnlock.create({
    data: {
      conversationId,
      userId,
      stage,
    },
  });
};

export const applyStageUnlock = async (
  { conversationId, role, targetStage },
  trx = null,
) => {
  const flagField = `user${role}Stage${targetStage}`;
  const partnerRole = role === "A" ? "B" : "A";
  const partnerFlagField = `user${partnerRole}Stage${targetStage}`;

  const run = async (tx) => {
    await tx.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        [flagField]: true,
      },
    });

    const fresh = await tx.conversation.findUnique({
      where: {
        id: conversationId,
      },
    });

    if (fresh[partnerFlagField]) {
      const updateData = {
        stage: targetStage,
        stageStartedAt: new Date(),
        lastActivityAt: new Date(),
      };

      if (targetStage === 5) {
        updateData.contactRevealed = true;
        updateData.contactRevealedAt = new Date();
      }

      const advanced = await tx.conversation.update({
        where: {
          id: conversationId,
        },
        data: updateData,
      });

      return {
        conversation: advanced,
        didAdvance: true,
        unlockedStage: targetStage,
      };
    }

    return {
      conversation: fresh,
      didAdvance: false,
      unlockedStage: targetStage,
    };
  };

  return trx ? run(trx) : prisma.$transaction(run);
};
