-- CreateTable
CREATE TABLE "BoostPostOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "BoostStatus" NOT NULL DEFAULT 'ACTIVE',
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "priceStars" INTEGER NOT NULL DEFAULT 0,
    "baseComments" INTEGER NOT NULL DEFAULT 0,
    "baseStars" INTEGER NOT NULL DEFAULT 0,
    "baseGifts" INTEGER NOT NULL DEFAULT 0,
    "baseShares" INTEGER NOT NULL DEFAULT 0,
    "statComments" INTEGER NOT NULL DEFAULT 0,
    "statStars" INTEGER NOT NULL DEFAULT 0,
    "statGifts" INTEGER NOT NULL DEFAULT 0,
    "statShares" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoostPostOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoostPostOrder_status_startAt_idx" ON "BoostPostOrder"("status", "startAt");

-- CreateIndex
CREATE INDEX "BoostPostOrder_postId_status_idx" ON "BoostPostOrder"("postId", "status");

-- CreateIndex
CREATE INDEX "BoostPostOrder_userId_status_idx" ON "BoostPostOrder"("userId", "status");

-- AddForeignKey
ALTER TABLE "BoostPostOrder" ADD CONSTRAINT "BoostPostOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoostPostOrder" ADD CONSTRAINT "BoostPostOrder_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoostPostOrder" ADD CONSTRAINT "BoostPostOrder_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BoostPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
