-- CreateTable
CREATE TABLE "PersonalIncomeTrackedYear" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalIncomeTrackedYear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalIncomeTrackedYear_userId_year_idx" ON "PersonalIncomeTrackedYear"("userId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalIncomeTrackedYear_householdId_userId_year_key" ON "PersonalIncomeTrackedYear"("householdId", "userId", "year");

-- AddForeignKey
ALTER TABLE "PersonalIncomeTrackedYear" ADD CONSTRAINT "PersonalIncomeTrackedYear_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalIncomeTrackedYear" ADD CONSTRAINT "PersonalIncomeTrackedYear_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
