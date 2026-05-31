-- F-10: Kontoname-Feld + familienweite Investments
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "account" TEXT NOT NULL DEFAULT '';

DROP INDEX IF EXISTS "Asset_householdId_ticker_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Asset_householdId_userId_ticker_key"
  ON "Asset"("householdId", "userId", "ticker");
