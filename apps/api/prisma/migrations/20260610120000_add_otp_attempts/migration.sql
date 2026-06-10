-- Compteur d'essais erronés pour limiter le brute-force des codes OTP
ALTER TABLE "otp_codes" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
