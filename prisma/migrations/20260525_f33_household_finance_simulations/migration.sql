-- F-33: Gespeicherte Haushaltskassen-Simulationen
-- Szenarien sind vollständig von echten Monatsdaten getrennt und hängen am Haushalt.

CREATE TYPE "SimulationEntryType" AS ENUM ('INCOME', 'PAYOUT');

CREATE TABLE "HouseholdFinanceSimulation" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "createdById" TEXT,
  "name" TEXT NOT NULL,
  "startYear" INTEGER NOT NULL,
  "startMonth" INTEGER NOT NULL,
  "endYear" INTEGER NOT NULL,
  "endMonth" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HouseholdFinanceSimulation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HouseholdFinanceSimulationMonth" (
  "id" TEXT NOT NULL,
  "simulationId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "fixedCosts" DECIMAL(12, 2) NOT NULL,
  CONSTRAINT "HouseholdFinanceSimulationMonth_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HouseholdFinanceSimulationEntry" (
  "id" TEXT NOT NULL,
  "simulationMonthId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "SimulationEntryType" NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  CONSTRAINT "HouseholdFinanceSimulationEntry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "HouseholdFinanceSimulation"
  ADD CONSTRAINT "HouseholdFinanceSimulation_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HouseholdFinanceSimulation"
  ADD CONSTRAINT "HouseholdFinanceSimulation_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HouseholdFinanceSimulationMonth"
  ADD CONSTRAINT "HouseholdFinanceSimulationMonth_simulationId_fkey"
  FOREIGN KEY ("simulationId") REFERENCES "HouseholdFinanceSimulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HouseholdFinanceSimulationEntry"
  ADD CONSTRAINT "HouseholdFinanceSimulationEntry_simulationMonthId_fkey"
  FOREIGN KEY ("simulationMonthId") REFERENCES "HouseholdFinanceSimulationMonth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HouseholdFinanceSimulationEntry"
  ADD CONSTRAINT "HouseholdFinanceSimulationEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "HouseholdFinanceSimulation_householdId_idx"
  ON "HouseholdFinanceSimulation"("householdId");

CREATE INDEX "HouseholdFinanceSimulation_createdById_idx"
  ON "HouseholdFinanceSimulation"("createdById");

CREATE UNIQUE INDEX "HouseholdFinanceSimulationMonth_simulationId_year_month_key"
  ON "HouseholdFinanceSimulationMonth"("simulationId", "year", "month");

CREATE INDEX "HouseholdFinanceSimulationMonth_simulationId_idx"
  ON "HouseholdFinanceSimulationMonth"("simulationId");

CREATE UNIQUE INDEX "HouseholdFinanceSimulationEntry_simulationMonthId_userId_type_key"
  ON "HouseholdFinanceSimulationEntry"("simulationMonthId", "userId", "type");

CREATE INDEX "HouseholdFinanceSimulationEntry_userId_idx"
  ON "HouseholdFinanceSimulationEntry"("userId");
