-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "archetype" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "dailyMinutes" INTEGER NOT NULL,
    "daysPerWeek" INTEGER NOT NULL,
    "preferredFormats" TEXT[],
    "language" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technique" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "practicePrompt" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "confidence" TEXT,
    "struggleCount" INTEGER NOT NULL DEFAULT 0,
    "bridgeForTechniqueId" TEXT,
    "searchQueries" TEXT[],

    CONSTRAINT "Technique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "techniqueId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "thumbnailUrl" TEXT,
    "source" TEXT NOT NULL,
    "durationSec" INTEGER,
    "selectionReason" TEXT NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechniqueContent" (
    "techniqueId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechniqueContent_pkey" PRIMARY KEY ("techniqueId","format")
);

-- CreateTable
CREATE TABLE "ResourceCacheEntry" (
    "key" TEXT NOT NULL,
    "candidates" JSONB NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceCacheEntry_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "QuotaUsage" (
    "resource" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuotaUsage_pkey" PRIMARY KEY ("resource","day")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_deviceId_key" ON "User"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "LearningPath_userId_createdAt_idx" ON "LearningPath"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Technique_pathId_position_idx" ON "Technique"("pathId", "position");

-- CreateIndex
CREATE INDEX "Resource_techniqueId_idx" ON "Resource"("techniqueId");

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technique" ADD CONSTRAINT "Technique_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_techniqueId_fkey" FOREIGN KEY ("techniqueId") REFERENCES "Technique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechniqueContent" ADD CONSTRAINT "TechniqueContent_techniqueId_fkey" FOREIGN KEY ("techniqueId") REFERENCES "Technique"("id") ON DELETE CASCADE ON UPDATE CASCADE;
