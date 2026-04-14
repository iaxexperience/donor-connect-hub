-- ============================================================
-- DIAGNÓSTICO + CORREÇÃO COMPLETA — Asaas Dashboard
-- Execute TUDO no Supabase SQL Editor de uma vez
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- PASSO 1: Garantir que as colunas existem na tabela donations
-- ──────────────────────────────────────────────────────────────
ALTER TABLE donations ADD COLUMN IF NOT EXISTS asaas_payment_id text;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS billing_type     text DEFAULT 'PIX';
ALTER TABLE donations ADD COLUMN IF NOT EXISTS due_date         date;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS confirmed_at     timestamptz;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS donation_date    timestamptz DEFAULT now();

-- Atualiza donation_date para quem ainda não tem (usa now() como fallback)
UPDATE donations SET donation_date = now() WHERE donation_date IS NULL;

-- ──────────────────────────────────────────────────────────────
-- PASSO 2: Garantir que a tabela payments_logs existe
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event      text NOT NULL,
  payload    jsonb,
  source     text DEFAULT 'asaas',
  status     text DEFAULT 'received',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payments_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_payments_logs" ON payments_logs;
CREATE POLICY "auth_all_payments_logs"
  ON payments_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- PASSO 3: Reconciliar pagamentos recebidos via Webhook
-- que ainda NÃO foram registrados em donations
-- (resolve o PIX de R$5,00 já recebido e qualquer outro anterior)
-- ──────────────────────────────────────────────────────────────
INSERT INTO donations (
  asaas_payment_id,
  amount,
  status,
  billing_type,
  donation_date,
  confirmed_at
)
SELECT
  pl.payload->'payment'->>'id'                                              AS asaas_payment_id,
  (pl.payload->'payment'->>'value')::numeric                                AS amount,
  'confirmed'                                                               AS status,
  COALESCE(pl.payload->'payment'->>'billingType', 'PIX')                   AS billing_type,
  COALESCE(
    (pl.payload->'payment'->>'confirmedDate')::timestamptz,
    pl.created_at
  )                                                                         AS donation_date,
  COALESCE(
    (pl.payload->'payment'->>'confirmedDate')::timestamptz,
    pl.created_at
  )                                                                         AS confirmed_at
FROM payments_logs pl
WHERE pl.event IN ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED')
  AND pl.payload->'payment'->>'id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM donations d
    WHERE d.asaas_payment_id = pl.payload->'payment'->>'id'
  );

-- ──────────────────────────────────────────────────────────────
-- PASSO 4: Atualizar status das doações que têm payment_id
-- mas ainda estão como 'pending' e já tiveram RECEIVED no webhook
-- ──────────────────────────────────────────────────────────────
UPDATE donations d
SET
  status       = 'confirmed',
  confirmed_at = COALESCE(
    (pl.payload->'payment'->>'confirmedDate')::timestamptz,
    pl.created_at
  )
FROM payments_logs pl
WHERE pl.event IN ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED')
  AND pl.payload->'payment'->>'id' = d.asaas_payment_id
  AND (d.status = 'pending' OR d.status IS NULL OR d.status = 'PENDING')
  AND d.confirmed_at IS NULL;

-- ──────────────────────────────────────────────────────────────
-- PASSO 5: Verificação — mostre os dados após correção
-- ──────────────────────────────────────────────────────────────
SELECT
  'Total donations Asaas' AS label,
  COUNT(*) AS total,
  SUM(amount) AS total_amount
FROM donations
WHERE asaas_payment_id IS NOT NULL;

SELECT
  'Confirmed today' AS label,
  COUNT(*) AS total,
  SUM(amount) AS total_amount
FROM donations
WHERE asaas_payment_id IS NOT NULL
  AND status = 'confirmed'
  AND (confirmed_at::date = CURRENT_DATE OR donation_date::date = CURRENT_DATE);

SELECT
  id, asaas_payment_id, amount, status, billing_type, donation_date, confirmed_at
FROM donations
WHERE asaas_payment_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
