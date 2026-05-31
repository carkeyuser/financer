-- AlterTable
ALTER TABLE "AssetEntry" ADD COLUMN "importRef" TEXT;

-- AlterTable
ALTER TABLE "DividendPayment" ADD COLUMN "importRef" TEXT;

-- CreateIndex
CREATE INDEX "AssetEntry_importRef_idx" ON "AssetEntry"("importRef");

-- CreateIndex
CREATE INDEX "DividendPayment_importRef_idx" ON "DividendPayment"("importRef");
