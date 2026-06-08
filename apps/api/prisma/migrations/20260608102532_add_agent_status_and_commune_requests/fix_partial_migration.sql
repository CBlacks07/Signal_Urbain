-- Script idempotent : complete la migration meme si elle a deja partiellement tourne.
-- Sans danger a executer plusieurs fois.

-- 1) Type enum (ignore s'il existe deja)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequestStatus') THEN
    CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

-- 2) Colonne isActive sur users (ignore si elle existe deja)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- 3) Table commune_change_requests (ignore si elle existe deja)
CREATE TABLE IF NOT EXISTS "commune_change_requests" (
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

-- 4) Index (ignore s'il existe deja)
CREATE INDEX IF NOT EXISTS "commune_change_requests_toCommuneId_status_idx" ON "commune_change_requests"("toCommuneId", "status");

-- 5) Cles etrangeres (ignore si elles existent deja)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commune_change_requests_userId_fkey') THEN
    ALTER TABLE "commune_change_requests" ADD CONSTRAINT "commune_change_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commune_change_requests_fromCommuneId_fkey') THEN
    ALTER TABLE "commune_change_requests" ADD CONSTRAINT "commune_change_requests_fromCommuneId_fkey" FOREIGN KEY ("fromCommuneId") REFERENCES "communes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commune_change_requests_toCommuneId_fkey') THEN
    ALTER TABLE "commune_change_requests" ADD CONSTRAINT "commune_change_requests_toCommuneId_fkey" FOREIGN KEY ("toCommuneId") REFERENCES "communes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commune_change_requests_reviewedBy_fkey') THEN
    ALTER TABLE "commune_change_requests" ADD CONSTRAINT "commune_change_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
