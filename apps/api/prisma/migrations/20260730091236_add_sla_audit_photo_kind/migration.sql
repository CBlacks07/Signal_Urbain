-- CreateEnum
CREATE TYPE "PhotoKind" AS ENUM ('AVANT', 'APRES');

-- AlterTable
ALTER TABLE "incident_photos" ADD COLUMN     "kind" "PhotoKind" NOT NULL DEFAULT 'AVANT';

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "blockedReason" TEXT,
ADD COLUMN     "blockedSince" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "sla_rules" (
    "id" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "targetHours" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "suspendOnThirdParty" BOOLEAN NOT NULL DEFAULT false,
    "requireAfterPhoto" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sla_rules_priority_key" ON "sla_rules"("priority");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);
