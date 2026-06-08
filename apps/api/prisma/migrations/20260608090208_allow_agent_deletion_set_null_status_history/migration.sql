-- DropForeignKey
ALTER TABLE "status_history" DROP CONSTRAINT "status_history_changedBy_fkey";

-- AlterTable
ALTER TABLE "status_history" ALTER COLUMN "changedBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
