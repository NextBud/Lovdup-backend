/*
  Warnings:

  - You are about to drop the column `aboutMe` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `birthDate` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `childrenPreference` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `drinking` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `ethnicity` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `financialStatus` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `fitnessImportance` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `languages` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `moneyStyle` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `occupation` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `originCountry` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `personalCommStyle` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `personalTuesdayVibe` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `religion` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `religionImportance` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `relocationFeelings` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `residenceCity` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `residenceCountry` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `smoking` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `socialLife` on the `Profile` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MediaProcessingStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED');

-- DropIndex
DROP INDEX "MatchRequest_senderId_receiverId_key";

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "aboutMe",
DROP COLUMN "birthDate",
DROP COLUMN "childrenPreference",
DROP COLUMN "drinking",
DROP COLUMN "ethnicity",
DROP COLUMN "financialStatus",
DROP COLUMN "firstName",
DROP COLUMN "fitnessImportance",
DROP COLUMN "gender",
DROP COLUMN "languages",
DROP COLUMN "lastName",
DROP COLUMN "moneyStyle",
DROP COLUMN "occupation",
DROP COLUMN "originCountry",
DROP COLUMN "personalCommStyle",
DROP COLUMN "personalTuesdayVibe",
DROP COLUMN "religion",
DROP COLUMN "religionImportance",
DROP COLUMN "relocationFeelings",
DROP COLUMN "residenceCity",
DROP COLUMN "residenceCountry",
DROP COLUMN "smoking",
DROP COLUMN "socialLife",
ADD COLUMN     "completionPercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "photosProcessingStatus" "MediaProcessingStatus" NOT NULL DEFAULT 'UPLOADING',
ADD COLUMN     "voiceProcessingStatus" "MediaProcessingStatus" NOT NULL DEFAULT 'UPLOADING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "photosProcessingStatus" "MediaProcessingStatus" NOT NULL DEFAULT 'UPLOADING',
ADD COLUMN     "voiceProcessingStatus" "MediaProcessingStatus" NOT NULL DEFAULT 'UPLOADING';

-- AlterTable
ALTER TABLE "VoiceAnswer" ADD COLUMN     "language" TEXT,
ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "transcriptionStatus" TEXT,
ADD COLUMN     "waveformUrl" TEXT;

-- CreateTable
CREATE TABLE "OnboardingMedia" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL,
    "position" INTEGER,
    "promptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileIdentity" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "originCountry" TEXT NOT NULL,
    "residenceCountry" TEXT NOT NULL,
    "residenceCity" TEXT NOT NULL,
    "ethnicity" TEXT,
    "languages" TEXT[],
    "occupation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileLifestyle" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "drinking" TEXT NOT NULL,
    "smoking" TEXT NOT NULL,
    "socialLife" TEXT NOT NULL,
    "fitnessImportance" TEXT NOT NULL,
    "moneyStyle" TEXT NOT NULL,
    "relocationFeelings" TEXT NOT NULL,
    "financialStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileLifestyle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileValues" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "religion" TEXT NOT NULL,
    "religionImportance" TEXT NOT NULL,
    "childrenPreference" TEXT NOT NULL,
    "personalCommStyle" TEXT NOT NULL,
    "personalTuesdayVibe" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileValues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileNarrative" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "aboutMe" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileNarrative_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnboardingMedia_userId_idx" ON "OnboardingMedia"("userId");

-- CreateIndex
CREATE INDEX "OnboardingMedia_mediaType_idx" ON "OnboardingMedia"("mediaType");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileIdentity_profileId_key" ON "ProfileIdentity"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileLifestyle_profileId_key" ON "ProfileLifestyle"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileValues_profileId_key" ON "ProfileValues"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileNarrative_profileId_key" ON "ProfileNarrative"("profileId");

-- CreateIndex
CREATE INDEX "MatchRequest_senderId_receiverId_idx" ON "MatchRequest"("senderId", "receiverId");

-- AddForeignKey
ALTER TABLE "OnboardingMedia" ADD CONSTRAINT "OnboardingMedia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileIdentity" ADD CONSTRAINT "ProfileIdentity_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileLifestyle" ADD CONSTRAINT "ProfileLifestyle_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileValues" ADD CONSTRAINT "ProfileValues_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileNarrative" ADD CONSTRAINT "ProfileNarrative_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
