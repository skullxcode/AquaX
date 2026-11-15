-- Add account lifecycle controls and auditable procurement / ledger reversal links.
ALTER TABLE "User"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "StockMovement"
  ADD COLUMN "supplierId" TEXT;

CREATE INDEX "StockMovement_itemId_createdAt_idx" ON "StockMovement"("itemId", "createdAt");
CREATE INDEX "StockMovement_supplierId_idx" ON "StockMovement"("supplierId");

ALTER TABLE "StockMovement"
  ADD CONSTRAINT "StockMovement_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancialEntry"
  ADD COLUMN "reversalOfId" TEXT;

CREATE UNIQUE INDEX "FinancialEntry_reversalOfId_key" ON "FinancialEntry"("reversalOfId");

ALTER TABLE "FinancialEntry"
  ADD CONSTRAINT "FinancialEntry_reversalOfId_fkey"
  FOREIGN KEY ("reversalOfId") REFERENCES "FinancialEntry"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "Payment"
  ADD COLUMN "reversedAt" TIMESTAMP(3),
  ADD COLUMN "reversedReason" TEXT;


ALTER TABLE "FinancialEntry" ADD COLUMN "paymentId" TEXT;
CREATE UNIQUE INDEX "FinancialEntry_paymentId_key" ON "FinancialEntry"("paymentId");
ALTER TABLE "FinancialEntry"
  ADD CONSTRAINT "FinancialEntry_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
