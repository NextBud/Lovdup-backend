import prisma from "../config/prisma.js";

async function main() {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ userAId: null }, { userBId: null }],
    },
    include: {
      match: {
        select: {
          userAId: true,
          userBId: true,
        },
      },
    },
  });

  console.log(`Found ${conversations.length} conversations`);

  for (const conversation of conversations) {
    await prisma.conversation.update({
      where: {
        id: conversation.id,
      },
      data: {
        userAId: conversation.match.userAId,
        userBId: conversation.match.userBId,
      },
    });
  }

  console.log("Backfill complete");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
