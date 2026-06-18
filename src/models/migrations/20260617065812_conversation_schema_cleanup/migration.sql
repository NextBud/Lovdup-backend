/*
  Warnings:

  - The values [START_STAGE_2,START_STAGE_3,START_STAGE_4,UNLOCK_STAGE_5] on the enum `WalletTransactionReason` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `userAStage5` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `userBStage5` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the `Block` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'CLOSED');

-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE 'CONTACT';

-- AlterEnum
BEGIN;
CREATE TYPE "WalletTransactionReason_new" AS ENUM ('REQUEST_NEW_MATCHES', 'START_STAGE_1', 'UNLOCK_STAGE_2', 'UNLOCK_STAGE_3', 'UNLOCK_STAGE_4', 'COMPLIMENT_PICTURE', 'ADMIN_ADJUSTMENT');
ALTER TABLE "WalletTransaction" ALTER COLUMN "reason" TYPE "WalletTransactionReason_new" USING ("reason"::text::"WalletTransactionReason_new");
ALTER TYPE "WalletTransactionReason" RENAME TO "WalletTransactionReason_old";
ALTER TYPE "WalletTransactionReason_new" RENAME TO "WalletTransactionReason";
DROP TYPE "public"."WalletTransactionReason_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Block" DROP CONSTRAINT "Block_blockedId_fkey";

-- DropForeignKey
ALTER TABLE "Block" DROP CONSTRAINT "Block_blockerId_fkey";

-- DropIndex
DROP INDEX "MatchResult_candidateId_key";

-- DropIndex
DROP INDEX "MatchResult_viewerId_key";

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "userAStage5",
DROP COLUMN "userBStage5",
ADD COLUMN     "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "senderId" DROP NOT NULL;

-- DropTable
DROP TABLE "Block";

-- CreateTable
CREATE TABLE "UserBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserBlock_blockerId_idx" ON "UserBlock"("blockerId");

-- CreateIndex
CREATE INDEX "UserBlock_blockedId_idx" ON "UserBlock"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedId_key" ON "UserBlock"("blockerId", "blockedId");

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
