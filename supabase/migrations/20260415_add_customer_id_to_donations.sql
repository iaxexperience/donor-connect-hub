-- ============================================================
-- Migration: Add asaas_customer_id to Donations
-- ============================================================

-- 1. Add column
ALTER TABLE donations ADD COLUMN IF NOT EXISTS asaas_customer_id text;

-- 2. Add index for performance
CREATE INDEX IF NOT EXISTS idx_donations_asaas_customer ON donations(asaas_customer_id);

-- 3. Backfill data from payments_logs
UPDATE donations d
SET asaas_customer_id = pl.payload->'payment'->>'customer'
FROM payments_logs pl
WHERE pl.payload->'payment'->>'id' = d.asaas_payment_id
  AND d.asaas_customer_id IS NULL;
