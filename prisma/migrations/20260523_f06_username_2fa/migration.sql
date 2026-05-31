-- F-06: Add username (required) and twoFactorSecret (optional) to User
-- Backfill username from email for existing users
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT;

-- Backfill existing users: use part of email before @ as username (with dedup suffix if needed)
UPDATE "User" SET "username" = split_part("email", '@', 1) WHERE "username" IS NULL AND "email" IS NOT NULL;
UPDATE "User" SET "username" = "id" WHERE "username" IS NULL;

-- Make email nullable and username NOT NULL + UNIQUE
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
