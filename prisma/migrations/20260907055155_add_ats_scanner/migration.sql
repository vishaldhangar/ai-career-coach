-- CreateTable
CREATE TABLE "AtsScan" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "resumeContent" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "keywordScore" DOUBLE PRECISION NOT NULL,
    "structureScore" DOUBLE PRECISION NOT NULL,
    "experienceScore" DOUBLE PRECISION NOT NULL,
    "skillsScore" DOUBLE PRECISION NOT NULL,
    "formattingScore" DOUBLE PRECISION NOT NULL,
    "matchedKeywords" TEXT[],
    "missingKeywords" TEXT[],
    "suggestions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtsScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AtsScan_resumeId_idx" ON "AtsScan"("resumeId");

-- AddForeignKey
ALTER TABLE "AtsScan" ADD CONSTRAINT "AtsScan_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
