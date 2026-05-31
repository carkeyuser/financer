-- F-11: Dashboard Widget-Konfiguration pro User
-- Speichert Position (x, y, w, h) jedes aktivierten Widgets pro User.

CREATE TABLE "DashboardWidget" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "widgetId" TEXT NOT NULL,
  "x" INTEGER NOT NULL DEFAULT 0,
  "y" INTEGER NOT NULL DEFAULT 0,
  "w" INTEGER NOT NULL DEFAULT 4,
  "h" INTEGER NOT NULL DEFAULT 3,
  CONSTRAINT "DashboardWidget_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DashboardWidget"
  ADD CONSTRAINT "DashboardWidget_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "DashboardWidget_userId_widgetId_key"
  ON "DashboardWidget"("userId", "widgetId");
