-- F-08: 2FA (TOTP) — twoFactorEnabled Pflichtfeld
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
