-- ============================================================
-- Migration: Fix Asaas Constraints & Reconciliation
-- ============================================================

-- 0. Update donation_status enum with missing values
-- Note: In some Postgres versions/environments, this cannot run inside a transaction.
-- If this fails, run these lines individually in the SQL Editor.
ALTER TYPE donation_status ADD VALUE IF NOT EXISTS 'vencido';
ALTER TYPE donation_status ADD VALUE IF NOT EXISTS 'cancelado';
ALTER TYPE donation_status ADD VALUE IF NOT EXISTS 'estornado';

-- 1. Expand billing_type CHECK constraint
-- First, drop the old constraint if it exists
DO $$
BEGIN
    ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_billing_type_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Add the expanded constraint
ALTER TABLE donations ADD CONSTRAINT donations_billing_type_check 
CHECK (billing_type IN ('PIX', 'BOLETO', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER', 'DEPOSIT', 'FINANCING', 'UNDEFINED', 'CREDIT_DIRECT_DEBIT', 'DEBIT_DIRECT_DEBIT'));

-- 2. Add UNIQUE constraint to asaas_payment_id
-- First, clean up any accidental duplicates (keep only the oldest one)
DELETE FROM donations d1
WHERE d1.asaas_payment_id IS NOT NULL
  AND d1.id::text > (
    SELECT MIN(d2.id::text) 
    FROM donations d2 
    WHERE d2.asaas_payment_id = d1.asaas_payment_id
  );

-- Now add the constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'donations_asaas_payment_id_key'
    ) THEN
        ALTER TABLE donations ADD CONSTRAINT donations_asaas_payment_id_key UNIQUE (asaas_payment_id);
    END IF;
END $$;

-- 3. Enum donation_status handles the values, no need for manual check constraint here
-- but we ensure the column is using the enum if it wasn't already.
-- (This part is usually handled by the column definition itself)

-- 4. RECONCILIATION: Recover missing donations from logs
-- Insert payments that exist in logs but NOT in donations table
-- Using DISTINCT ON to ensure we don't try to insert the same payment ID twice from multiple log entries
INSERT INTO donations (
  asaas_payment_id,
  donor_id,
  amount,
  status,
  billing_type,
  donation_date,
  confirmed_at,
  payment_method
)
SELECT DISTINCT ON (pl.payload->'payment'->>'id')
  pl.payload->'payment'->>'id'                                              AS asaas_payment_id,
  (SELECT id FROM donors WHERE asaas_customer_id = pl.payload->'payment'->>'customer' LIMIT 1) AS donor_id,
  (pl.payload->'payment'->>'value')::numeric                                AS amount,
  'pago'                                                                    AS status,
  COALESCE(pl.payload->'payment'->>'billingType', 'PIX')                   AS billing_type,
  COALESCE(
    NULLIF(pl.payload->'payment'->>'confirmedDate', '')::timestamptz,
    pl.created_at
  )                                                                         AS donation_date,
  COALESCE(
    NULLIF(pl.payload->'payment'->>'confirmedDate', '')::timestamptz,
    pl.created_at
  )                                                                         AS confirmed_at,
  'Asaas'                                                                   AS payment_method
FROM payments_logs pl
WHERE pl.event IN ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED')
  AND pl.payload->'payment'->>'id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM donations d
    WHERE d.asaas_payment_id = pl.payload->'payment'->>'id'
  )
ORDER BY pl.payload->'payment'->>'id', pl.created_at DESC;

-- 5. Fix any 'pending' donations that were already paid in logs
UPDATE donations d
SET
  status       = 'pago',
  confirmed_at = COALESCE(
    NULLIF(pl.payload->'payment'->>'confirmedTime', '')::timestamptz,
    NULLIF(pl.payload->'payment'->>'confirmedDate', '')::timestamptz,
    pl.created_at
  )
FROM payments_logs pl
WHERE pl.event IN ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED')
  AND pl.payload->'payment'->>'id' = d.asaas_payment_id
  AND d.status != 'pago';
