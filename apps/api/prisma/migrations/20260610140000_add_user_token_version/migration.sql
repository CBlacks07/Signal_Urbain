-- Versionnage des tokens pour permettre la révocation de toutes les sessions (logout-all)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
