/*
  Warnings:

  - The values [PASS] on the enum `MatchRequestType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `profileScore` on the `CompatibilityScore` table. All the data in the column will be lost.
  - You are about to drop the column `ageRange` on the `MatchPreference` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[senderId,receiverId]` on the table `MatchRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('SYSTEM', 'TEXT', 'VOICE', 'PHOTO');

-- AlterEnum
BEGIN;
CREATE TYPE "MatchRequestType_new" AS ENUM ('LIKE', 'SUPER_LIKE');
ALTER TABLE "public"."MatchRequest" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "MatchRequest" ALTER COLUMN "type" TYPE "MatchRequestType_new" USING ("type"::text::"MatchRequestType_new");
ALTER TYPE "MatchRequestType" RENAME TO "MatchRequestType_old";
ALTER TYPE "MatchRequestType_new" RENAME TO "MatchRequestType";
DROP TYPE "public"."MatchRequestType_old";
ALTER TABLE "MatchRequest" ALTER COLUMN "type" SET DEFAULT 'LIKE';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WalletTransactionReason" ADD VALUE 'START_STAGE_2';
ALTER TYPE "WalletTransactionReason" ADD VALUE 'START_STAGE_3';
ALTER TYPE "WalletTransactionReason" ADD VALUE 'START_STAGE_4';
ALTER TYPE "WalletTransactionReason" ADD VALUE 'UNLOCK_STAGE_5';

-- AlterTable
ALTER TABLE "CompatibilityScore" DROP COLUMN "profileScore",
ADD COLUMN     "identityScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MatchPreference" DROP COLUMN "ageRange",
ADD COLUMN     "ageMax" INTEGER NOT NULL DEFAULT 99,
ADD COLUMN     "ageMin" INTEGER NOT NULL DEFAULT 18;

-- AlterTable
ALTER TABLE "OnboardingProgress" ADD COLUMN     "maxReachedStep" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ProfileIdentity" ADD COLUMN     "education" TEXT,
ADD COLUMN     "relationshipIntention" TEXT;

-- AlterTable
ALTER TABLE "ProfileValues" ADD COLUMN     "hasChildren" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 1,
    "userAStage2" BOOLEAN NOT NULL DEFAULT false,
    "userBStage2" BOOLEAN NOT NULL DEFAULT false,
    "userAStage3" BOOLEAN NOT NULL DEFAULT false,
    "userBStage3" BOOLEAN NOT NULL DEFAULT false,
    "userAStage4" BOOLEAN NOT NULL DEFAULT false,
    "userBStage4" BOOLEAN NOT NULL DEFAULT false,
    "userAStage5" BOOLEAN NOT NULL DEFAULT false,
    "userBStage5" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" "MessageType" NOT NULL,
    "body" TEXT,
    "voiceUrl" TEXT,
    "voiceDuration" INTEGER,
    "photoUrl" TEXT,
    "contactValue" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_matchId_key" ON "Conversation"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_lastMessageId_key" ON "Conversation"("lastMessageId");

-- CreateIndex
CREATE INDEX "Conversation_matchId_idx" ON "Conversation"("matchId");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchRequest_senderId_receiverId_key" ON "MatchRequest"("senderId", "receiverId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_lastMessageId_fkey" FOREIGN KEY ("lastMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
