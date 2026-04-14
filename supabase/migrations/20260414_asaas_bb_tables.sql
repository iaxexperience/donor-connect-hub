-- ============================================================
-- Migration: Asaas & Banco do Brasil — Tabelas e Campos
-- Execute no Supabase SQL Editor
-- Seguro de reexecutar (usa IF NOT EXISTS e ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. bank_transactions  (Extrato do Banco do Brasil)
-- Colunas usadas em: bbService.getTransactions(), getStats()
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text UNIQUE NOT NULL,
  amount         numeric(15, 2) NOT NULL DEFAULT 0,
  type           text NOT NULL CHECK (type IN ('credit', 'debit')),
  description    text,
  date           timestamptz NOT NULL,
  matched        boolean NOT NULL DEFAULT false,
  source         text NOT NULL DEFAULT 'banco_brasil',
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS matched_donation_id uuid;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS matched_at timestamptz;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS raw_data jsonb;

-- ──────────────────────────────────────────────────────────────
-- 2. payments_logs  (Webhook events do Asaas)
-- Colunas usadas em: asaasService.getLogs()
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event      text NOT NULL,
  payload    jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments_logs ADD COLUMN IF NOT EXISTS source text DEFAULT 'asaas';
ALTER TABLE payments_logs ADD COLUMN IF NOT EXISTS status text DEFAULT 'received';

-- ──────────────────────────────────────────────────────────────
-- 3. integration_logs  (Audit log genérico)
-- Colunas usadas em: bbService.getLogs(), asaasService.getLogs()
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integration_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source     text NOT NULL, -- 'banco_brasil' | 'asaas'
  event      text NOT NULL,
  payload    jsonb,
  status     text NOT NULL DEFAULT 'success',
  created_at timestamptz DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 4. donations — colunas adicionais do Asaas
-- Usadas em: asaasService.getDonations(), getDashboardData()
-- ──────────────────────────────────────────────────────────────
ALTER TABLE donations ADD COLUMN IF NOT EXISTS asaas_payment_id text;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS billing_type text DEFAULT 'PIX'
  CHECK (billing_type IN ('PIX', 'BOLETO', 'CREDIT_CARD', 'DEBIT_CARD', 'UNDEFINED'));
ALTER TABLE donations ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS transaction_id uuid;

-- ──────────────────────────────────────────────────────────────
-- 5. donors — campo do cliente Asaas
-- Usada em: asaasService.createCustomer()
-- ──────────────────────────────────────────────────────────────
ALTER TABLE donors ADD COLUMN IF NOT EXISTS asaas_customer_id text;

-- ──────────────────────────────────────────────────────────────
-- Indexes
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date     ON bank_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_matched  ON bank_transactions(matched);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_source   ON bank_transactions(source);
CREATE INDEX IF NOT EXISTS idx_integration_logs_source    ON integration_logs(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_logs_event        ON payments_logs(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_asaas            ON donations(asaas_payment_id) WHERE asaas_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donors_asaas               ON donors(asaas_customer_id) WHERE asaas_customer_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────────────────────
ALTER TABLE bank_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs   ENABLE ROW LEVEL SECURITY;

-- bank_transactions
DROP POLICY IF EXISTS "auth_all_bank_transactions" ON bank_transactions;
CREATE POLICY "auth_all_bank_transactions"
  ON bank_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- payments_logs
DROP POLICY IF EXISTS "auth_all_payments_logs" ON payments_logs;
CREATE POLICY "auth_all_payments_logs"
  ON payments_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- integration_logs
DROP POLICY IF EXISTS "auth_all_integration_logs" ON integration_logs;
CREATE POLICY "auth_all_integration_logs"
  ON integration_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- Verificação final: lista tabelas criadas
-- ──────────────────────────────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'bank_transactions', 'payments_logs', 'integration_logs', 'donations', 'donors'
  )
ORDER BY table_name;
