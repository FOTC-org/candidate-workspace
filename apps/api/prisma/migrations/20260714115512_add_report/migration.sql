-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "isEmpty" BOOLEAN NOT NULL,
    "analysisCount" INTEGER NOT NULL,
    "sentimentDistribution" JSONB NOT NULL,
    "mostActiveUsers" JSONB NOT NULL,
    "coversOnlyInactiveUsers" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_requestedById_createdAt_idx" ON "reports"("requestedById", "createdAt");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
