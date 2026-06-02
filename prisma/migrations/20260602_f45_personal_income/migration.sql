-- CreateTable
CREATE TABLE "PersonalIncomeMonth" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "grossSalary" DECIMAL(12,2),
    "netSalary" DECIMAL(12,2),
    "monthBonus" DECIMAL(12,2),
    "note" TEXT,
    "syncedToHouseholdAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalIncomeMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalIncomeBonus" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalIncomeBonus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalIncomeMonth_userId_year_idx" ON "PersonalIncomeMonth"("userId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalIncomeMonth_householdId_userId_year_month_key" ON "PersonalIncomeMonth"("householdId", "userId", "year", "month");

-- CreateIndex
CREATE INDEX "PersonalIncomeBonus_householdId_userId_date_idx" ON "PersonalIncomeBonus"("householdId", "userId", "date");

-- AddForeignKey
ALTER TABLE "PersonalIncomeMonth" ADD CONSTRAINT "PersonalIncomeMonth_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalIncomeMonth" ADD CONSTRAINT "PersonalIncomeMonth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalIncomeBonus" ADD CONSTRAINT "PersonalIncomeBonus_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalIncomeBonus" ADD CONSTRAINT "PersonalIncomeBonus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
