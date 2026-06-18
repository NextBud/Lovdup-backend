/*
  Warnings:

  - A unique constraint covering the columns `[viewerId]` on the table `MatchResult` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[candidateId]` on the table `MatchResult` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "ConversationUnlock" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationUnlock_conversationId_idx" ON "ConversationUnlock"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationUnlock_userId_idx" ON "ConversationUnlock"("userId");

-- CreateIndex
CREATE INDEX "ConversationUnlock_stage_idx" ON "ConversationUnlock"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "MatchResult_viewerId_key" ON "MatchResult"("viewerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchResult_candidateId_key" ON "MatchResult"("candidateId");

-- AddForeignKey
ALTER TABLE "ConversationUnlock" ADD CONSTRAINT "ConversationUnlock_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationUnlock" ADD CONSTRAINT "ConversationUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
