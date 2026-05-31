-- F-32: Persistente manuelle Dividenden-Buchungen.
-- Yahoo-Dividenden werden zur Laufzeit ergänzt; manuelle Buchungen sind die Quelle für erhaltene/korrigierte Zahlungen.

CREATE TYPE "DividendStatus" AS ENUM ('EXPECTED', 'RECEIVED');
CREATE TYPE "DividendSource" AS ENUM ('YAHOO', 'MANUAL');

CREATE TABLE "DividendPayment" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "exDate" TIMESTAMP(3) NOT NULL,
  "payDate" TIMESTAMP(3),
  "amountPerShare" DECIMAL(18, 6) NOT NULL,
  "quantity" DECIMAL(18, 6) NOT NULL,
  "grossAmount" DECIMAL(12, 2) NOT NULL,
  "taxAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "netAmount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "eurRate" DECIMAL(18, 6) NOT NULL DEFAULT 1,
  "status" "DividendStatus" NOT NULL DEFAULT 'RECEIVED',
  "source" "DividendSource" NOT NULL DEFAULT 'MANUAL',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DividendPayment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DividendPayment"
  ADD CONSTRAINT "DividendPayment_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DividendPayment"
  ADD CONSTRAINT "DividendPayment_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DividendPayment"
  ADD CONSTRAINT "DividendPayment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "DividendPayment_householdId_year_idx"
  ON "DividendPayment"("householdId", "year");

CREATE INDEX "DividendPayment_assetId_idx"
  ON "DividendPayment"("assetId");

CREATE INDEX "DividendPayment_userId_idx"
  ON "DividendPayment"("userId");

CREATE INDEX "DividendPayment_status_idx"
  ON "DividendPayment"("status");
