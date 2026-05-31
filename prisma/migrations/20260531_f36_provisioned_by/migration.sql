-- F-36: track who provisioned a user via admin panel
ALTER TABLE "User" ADD COLUMN "provisionedByUserId" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_provisionedByUserId_fkey"
  FOREIGN KEY ("provisionedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "User_provisionedByUserId_idx" ON "User"("provisionedByUserId");
