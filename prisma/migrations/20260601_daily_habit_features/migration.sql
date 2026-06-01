-- F-40–F-44: Daily Habit features

CREATE TYPE "NotificationType" AS ENUM (
  'PRICE_MOVE',
  'CALENDAR',
  'HOUSEHOLD_MONTH',
  'QUARTER_BONUS',
  'DIVIDEND_EXPECTED',
  'HOUSEHOLD_PARTNER_PENDING'
);

CREATE TYPE "HouseholdChecklistStep" AS ENUM (
  'INCOME',
  'FIXED_COSTS',
  'PAYOUTS',
  'TRANSFERS_DONE'
);

CREATE TABLE "PortfolioDailySnapshot" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "totalEur" DECIMAL(18,2) NOT NULL,
  "gainLossEur" DECIMAL(18,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortfolioDailySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "userId" TEXT,
  "type" "NotificationType" NOT NULL,
  "titleKey" TEXT NOT NULL,
  "bodyKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "dedupeKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationRead" (
  "notificationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("notificationId","userId")
);

CREATE TABLE "HouseholdMonthChecklist" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "step" "HouseholdChecklistStep" NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HouseholdMonthChecklist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PortfolioDailySnapshot_householdId_date_key"
  ON "PortfolioDailySnapshot"("householdId", "date");
CREATE INDEX "PortfolioDailySnapshot_householdId_idx"
  ON "PortfolioDailySnapshot"("householdId");

CREATE UNIQUE INDEX "Notification_householdId_dedupeKey_key"
  ON "Notification"("householdId", "dedupeKey");
CREATE INDEX "Notification_householdId_createdAt_idx"
  ON "Notification"("householdId", "createdAt");

CREATE UNIQUE INDEX "HouseholdMonthChecklist_householdId_year_month_userId_step_key"
  ON "HouseholdMonthChecklist"("householdId", "year", "month", "userId", "step");
CREATE INDEX "HouseholdMonthChecklist_householdId_year_month_idx"
  ON "HouseholdMonthChecklist"("householdId", "year", "month");

ALTER TABLE "PortfolioDailySnapshot"
  ADD CONSTRAINT "PortfolioDailySnapshot_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationRead"
  ADD CONSTRAINT "NotificationRead_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationRead"
  ADD CONSTRAINT "NotificationRead_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HouseholdMonthChecklist"
  ADD CONSTRAINT "HouseholdMonthChecklist_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdMonthChecklist"
  ADD CONSTRAINT "HouseholdMonthChecklist_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
