-- B-02: Fixkosten-Snapshot pro Monat
-- Speichert die Fixkosten zum Zeitpunkt der Einkommenseingabe, damit nachträgliche
-- Fixkosten-Änderungen abgeschlossene Monate nicht mehr retroaktiv verändern.

CREATE TABLE "MonthlyFixedCostSnapshot" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "fixedCosts" DECIMAL(12, 2) NOT NULL,
  CONSTRAINT "MonthlyFixedCostSnapshot_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MonthlyFixedCostSnapshot"
  ADD CONSTRAINT "MonthlyFixedCostSnapshot_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "MonthlyFixedCostSnapshot_householdId_year_month_key"
  ON "MonthlyFixedCostSnapshot"("householdId", "year", "month");
