-- Phase 6: Expenses entfernen, Haushaltskasse einführen

-- Expenses-Tabellen löschen
DROP TABLE IF EXISTS "Budget" CASCADE;
DROP TABLE IF EXISTS "Transaction" CASCADE;
DROP TABLE IF EXISTS "Category" CASCADE;

-- Enum löschen
DROP TYPE IF EXISTS "TransactionType";

-- Neue Tabellen: Haushaltskasse

CREATE TABLE "FixedCost" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FixedCost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MonthlyIncome" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonthlyIncome_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MonthlyPayout" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonthlyPayout_pkey" PRIMARY KEY ("id")
);

-- Indizes und Constraints

CREATE INDEX "FixedCost_householdId_idx" ON "FixedCost"("householdId");

CREATE UNIQUE INDEX "MonthlyIncome_householdId_userId_year_month_key"
    ON "MonthlyIncome"("householdId", "userId", "year", "month");

CREATE UNIQUE INDEX "MonthlyPayout_householdId_userId_year_month_key"
    ON "MonthlyPayout"("householdId", "userId", "year", "month");

-- Foreign Keys

ALTER TABLE "FixedCost" ADD CONSTRAINT "FixedCost_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonthlyIncome" ADD CONSTRAINT "MonthlyIncome_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonthlyIncome" ADD CONSTRAINT "MonthlyIncome_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MonthlyPayout" ADD CONSTRAINT "MonthlyPayout_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonthlyPayout" ADD CONSTRAINT "MonthlyPayout_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
