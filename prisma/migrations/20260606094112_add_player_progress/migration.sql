-- CreateTable
CREATE TABLE "PlayerProgress" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProgress_sessionId_key" ON "PlayerProgress"("sessionId");
