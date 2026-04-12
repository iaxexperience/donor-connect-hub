-- Migration: Asaas and BB Integration Tables
-- Run this in Supabase SQL Editor

-- Table: bank_transactions (Banco do Brasil extrato)
CREATE TABLE IF NOT EXISTS bank_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id text UNIQUE NOT NULL,
  amount numeric(12, 2) NOT NULL,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  description text,
  date timestamptz NOT NULL,
  matched boolean DEFAULT false,
  matched_donation_id uuid,
  matched_at timestamptz,
  raw_data jsonb,
  source text DEFAULT 'banco_brasil',
  created_at timestamptz DEFAULT now()
);

-- Table: payments_logs (Asaas webhook events)
CREATE TABLE IF NOT EXISTS payments_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table: integration_logs (generic integration audit)
CREATE TABLE IF NOT EXISTS integration_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL, -- 'banco_brasil' | 'asaas'
  event text NOT NULL,
  payload jsonb,
  status text DEFAULT 'success',
  created_at timestamptz DEFAULT now()
);

-- Alter donations table: add Asaas fields if not exists
ALTER TABLE donations ADD COLUMN IF NOT EXISTS asaas_payment_id text;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS billing_type text DEFAULT 'PIX';
ALTER TABLE donations ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS transaction_id uuid;

-- Alter donors table: add Asaas customer id if not exists
ALTER TABLE donors ADD COLUMN IF NOT EXISTS asaas_customer_id text;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_matched ON bank_transactions(matched);
CREATE INDEX IF NOT EXISTS idx_integration_logs_source ON integration_logs(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_logs_event ON payments_logs(event, created_at DESC);

-- Enable RLS  
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- Policies (authenticated users can read)
CREATE POLICY IF NOT EXISTS "Authenticated can read bank_transactions"
  ON bank_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated can read payments_logs"
  ON payments_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated can read integration_logs"
  ON integration_logs FOR SELECT TO authenticated USING (true);
