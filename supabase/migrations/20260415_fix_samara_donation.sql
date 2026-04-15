-- ============================================================
-- Fix: Register Samara Almeida's donation manually and reconcile
-- ============================================================

-- 1. Check current structure (run these SELECT queries first to verify)
-- SELECT id, name, phone, asaas_customer_id FROM donors WHERE name ILIKE '%samara%';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'donors' AND column_name = 'id';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'donations' AND column_name = 'donor_id';

-- 2. Insert Samara's donation from the payment log
-- First, find the payment details
INSERT INTO donations (
  asaas_payment_id,
  donor_id,
  asaas_customer_id,
  amount,
  status,
  billing_type,
  donation_date,
  confirmed_at,
  payment_method
)
SELECT DISTINCT ON (pl.payload->'payment'->>'id')
  pl.payload->'payment'->>'id' AS asaas_payment_id,
  (SELECT id FROM donors WHERE name ILIKE '%samara%' LIMIT 1) AS donor_id,
  pl.payload->'payment'->>'customer' AS asaas_customer_id,
  (pl.payload->'payment'->>'value')::numeric AS amount,
  'pago' AS status,
  COALESCE(pl.payload->'payment'->>'billingType', 'PIX') AS billing_type,
  COALESCE(
    NULLIF(pl.payload->'payment'->>'confirmedDate', '')::timestamptz,
    pl.created_at
  ) AS donation_date,
  COALESCE(
    NULLIF(pl.payload->'payment'->>'confirmedDate', '')::timestamptz,
    pl.created_at
  ) AS confirmed_at,
  'Asaas' AS payment_method
FROM payments_logs pl
WHERE pl.event IN ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED')
  AND pl.payload->'payment'->>'id' IS NOT NULL
  AND pl.payload->'payment'->>'customer' = (
    SELECT asaas_customer_id FROM donors WHERE name ILIKE '%samara%' LIMIT 1
  )
  AND NOT EXISTS (
    SELECT 1 FROM donations d
    WHERE d.asaas_payment_id = pl.payload->'payment'->>'id'
  )
ORDER BY pl.payload->'payment'->>'id', pl.created_at DESC;
