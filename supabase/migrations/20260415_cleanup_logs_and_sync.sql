-- ============================================================
-- Migration: Cleanup Webhook Logs and Sync Missing Data
-- ============================================================

-- 1. DE-DUPLICATE payments_logs
-- We keep only the LAST occurrence of each event for each payment ID
-- to remove the noise of failed retries.
DELETE FROM payments_logs pl1
WHERE pl1.payload->'payment'->>'id' IS NOT NULL
  AND pl1.id NOT IN (
    SELECT s.id
    FROM (
      SELECT DISTINCT ON (payload->'payment'->>'id', event) id
      FROM payments_logs
      WHERE payload->'payment'->>'id' IS NOT NULL
      ORDER BY payload->'payment'->>'id', event, created_at DESC
    ) s
  );

-- 2. FORCE SYNC: Ensure all payments from last 48h are in donations
-- This catches any that might have been missed due to previous errors
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
  CASE 
    WHEN pl.event IN ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED') THEN 'pago'::donation_status
    WHEN pl.event = 'PAYMENT_OVERDUE' THEN 'vencido'::donation_status
    WHEN pl.event = 'PAYMENT_DELETED' THEN 'cancelado'::donation_status
    ELSE 'pendente'::donation_status
  END                                                                       AS status,
  COALESCE(pl.payload->'payment'->>'billingType', 'PIX')                   AS billing_type,
  COALESCE(
    NULLIF(pl.payload->'payment'->>'confirmedDate', '')::timestamptz,
    NULLIF(pl.payload->'payment'->>'dateCreated', '')::timestamptz,
    pl.created_at
  )                                                                         AS donation_date,
  CASE 
    WHEN pl.event IN ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED') THEN 
      COALESCE(NULLIF(pl.payload->'payment'->>'confirmedDate', '')::timestamptz, pl.created_at)
    ELSE NULL 
  END                                                                       AS confirmed_at,
  'Asaas'                                                                   AS payment_method
FROM payments_logs pl
WHERE pl.payload->'payment'->>'id' IS NOT NULL
  AND pl.created_at > now() - interval '48 hours'
  AND NOT EXISTS (
    SELECT 1 FROM donations d
    WHERE d.asaas_payment_id = pl.payload->'payment'->>'id'
  )
ORDER BY pl.payload->'payment'->>'id', pl.created_at DESC;

-- 3. FINAL CHECK: Update any donation that should be 'pago' but isn't
UPDATE donations d
SET
  status       = 'pago'::donation_status,
  confirmed_at = COALESCE(NULLIF(pl.payload->'payment'->>'confirmedDate', '')::timestamptz, pl.created_at)
FROM payments_logs pl
WHERE pl.event IN ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED')
  AND pl.payload->'payment'->>'id' = d.asaas_payment_id
  AND d.status != 'pago'::donation_status
  AND pl.created_at > now() - interval '48 hours';
