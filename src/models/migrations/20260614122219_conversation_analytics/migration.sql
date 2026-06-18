-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "contactRevealed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contactRevealedAt" TIMESTAMP(3),
ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "stageStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Conversation_lastActivityAt_idx" ON "Conversation"("lastActivityAt");

-- CreateIndex
CREATE INDEX "Conversation_stage_idx" ON "Conversation"("stage");
