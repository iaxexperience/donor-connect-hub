-- Reconect missed Asaas donations from payments_logs that were blocked by the UUID bug

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
