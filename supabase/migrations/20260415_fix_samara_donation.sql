-- ============================================================
-- Fix: Link Samara's donations and update her stats
-- ============================================================

-- 1. Link any unlinked donations from Samara's Asaas customer ID
UPDATE donations d
SET donor_id = dr.id
FROM donors dr
WHERE dr.name ILIKE '%samara%'
  AND d.asaas_customer_id = dr.asaas_customer_id
  AND d.donor_id IS NULL;

-- 2. Also link by direct customer ID match for any that were missed
UPDATE donations d
SET donor_id = dr.id
FROM donors dr
WHERE dr.name ILIKE '%samara%'
  AND d.donor_id IS NULL
  AND EXISTS (
    SELECT 1 FROM payments_logs pl
    WHERE pl.payload->'payment'->>'id' = d.asaas_payment_id
    AND pl.payload->'payment'->>'customer' = dr.asaas_customer_id
  );
