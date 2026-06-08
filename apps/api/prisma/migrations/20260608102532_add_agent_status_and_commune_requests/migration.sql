-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "commune_change_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromCommuneId" TEXT,
    "toCommuneId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "commune_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commune_change_requests_toCommuneId_status_idx" ON "commune_change_requests"("toCommuneId", "status");

-- AddForeignKey
ALTER TABLE "commune_change_requests" ADD CONSTRAINT "commune_change_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commune_change_requests" ADD CONSTRAINT "commune_change_requests_fromCommuneId_fkey" FOREIGN KEY ("fromCommuneId") REFERENCES "communes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commune_change_requests" ADD CONSTRAINT "commune_change_requests_toCommuneId_fkey" FOREIGN KEY ("toCommuneId") REFERENCES "communes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commune_change_requests" ADD CONSTRAINT "commune_change_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
