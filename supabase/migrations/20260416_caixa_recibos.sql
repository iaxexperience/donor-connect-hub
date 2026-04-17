-- 1. Adicionar cartao_tipo em caixa_transacoes
ALTER TABLE caixa_transacoes ADD COLUMN IF NOT EXISTS cartao_tipo text CHECK (cartao_tipo IN ('debito','credito'));

-- 2. Adicionar campos de recibo em caixa_transacoes
ALTER TABLE caixa_transacoes ADD COLUMN IF NOT EXISTS receipt_number text UNIQUE;
ALTER TABLE caixa_transacoes ADD COLUMN IF NOT EXISTS validation_hash text UNIQUE;
ALTER TABLE caixa_transacoes ADD COLUMN IF NOT EXISTS qr_code_url text;

-- 3. Criar tabela caixas_dia (fechamento diário)
CREATE TABLE IF NOT EXISTS caixas_dia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL UNIQUE,
  total_dinheiro numeric(12,2) DEFAULT 0,
  total_pix numeric(12,2) DEFAULT 0,
  total_cartao numeric(12,2) DEFAULT 0,
  total_boleto numeric(12,2) DEFAULT 0,
  total_geral numeric(12,2) DEFAULT 0,
  qtd_transacoes integer DEFAULT 0,
  fechado_por uuid REFERENCES profiles(id) ON DELETE SET NULL,
  fechado_em timestamptz,
  status text DEFAULT 'aberto' CHECK (status IN ('aberto','fechado')),
  observacoes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE caixas_dia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura autenticada caixas_dia" ON caixas_dia
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Escrita autenticada caixas_dia" ON caixas_dia
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 5. Função para gerar receipt_number sequencial
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS text AS $$
DECLARE
  v_year text := to_char(now(), 'YYYY');
  v_seq bigint;
  v_number text;
BEGIN
  SELECT COALESCE(MAX(CAST(split_part(receipt_number, '-', 3) AS bigint)), 0) + 1
  INTO v_seq
  FROM caixa_transacoes
  WHERE receipt_number LIKE 'DOA-' || v_year || '-%';

  v_number := 'DOA-' || v_year || '-' || LPAD(v_seq::text, 6, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para gerar recibo automaticamente no INSERT
CREATE OR REPLACE FUNCTION fn_gerar_recibo()
RETURNS TRIGGER AS $$
DECLARE
  v_receipt text;
  v_hash text;
BEGIN
  -- Gerar número do recibo
  v_receipt := generate_receipt_number();
  NEW.receipt_number := v_receipt;

  -- Gerar hash de validação
  v_hash := encode(digest(
    v_receipt ||
    COALESCE(NEW.donor_id::text, '') ||
    NEW.amount::text ||
    to_char(NEW.created_at, 'YYYY-MM-DD'),
    'sha256'
  ), 'hex');
  NEW.validation_hash := v_hash;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gerar_recibo ON caixa_transacoes;
CREATE TRIGGER trg_gerar_recibo
  BEFORE INSERT ON caixa_transacoes
  FOR EACH ROW EXECUTE FUNCTION fn_gerar_recibo();
