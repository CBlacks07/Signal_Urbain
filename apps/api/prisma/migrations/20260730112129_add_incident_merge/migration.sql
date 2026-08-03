-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "mergedIntoId" TEXT;

-- CreateIndex
CREATE INDEX "incidents_mergedIntoId_idx" ON "incidents"("mergedIntoId");

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
