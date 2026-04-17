-- ============================================================
--  SCHEMA COMPLETO — FAP Pulse Doações
--  Execute este arquivo no Supabase SQL Editor
--  Ordem: extensões → perfis → configurações → caixa → físicas
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. EXTENSÕES
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ────────────────────────────────────────────────────────────
-- 2. PERFIS DE USUÁRIO (ajustes na tabela existente)
-- ────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- Garante que admins existentes não sejam bloqueados
UPDATE profiles SET must_change_password = false WHERE role = 'admin';


-- ────────────────────────────────────────────────────────────
-- 3. CONFIGURAÇÕES WHITE LABEL
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS white_label_settings (
  id            integer PRIMARY KEY DEFAULT 1,
  system_name   text DEFAULT 'Pulse Doações',
  primary_color text DEFAULT '#0066CC',
  secondary_color text DEFAULT '#2a9d8f',
  logo_url      text,
  cnpj          text,
  phone         text,
  email         text,
  address       text,
  opening_time  text,
  closing_time  text,
  updated_at    timestamptz DEFAULT now(),
  CONSTRAINT only_one_row CHECK (id = 1)
);

INSERT INTO white_label_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE white_label_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'white_label_settings' AND policyname = 'Leitura autenticada'
  ) THEN
    CREATE POLICY "Leitura autenticada" ON white_label_settings
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'white_label_settings' AND policyname = 'Escrita admin'
  ) THEN
    CREATE POLICY "Escrita admin" ON white_label_settings
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 4. CAIXA DE DOAÇÕES — TRANSAÇÕES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS caixa_transacoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id       integer REFERENCES donors(id) ON DELETE SET NULL,
  donor_name     text NOT NULL DEFAULT 'Anônimo',
  amount         numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('dinheiro','pix','cartao','boleto')),
  cartao_tipo    text CHECK (cartao_tipo IN ('debito','credito')),
  status         text NOT NULL DEFAULT 'confirmado'
                   CHECK (status IN ('confirmado','pendente','cancelado')),
  notes          text,
  compensated_at timestamptz,
  receipt_number text UNIQUE,
  validation_hash text UNIQUE,
  qr_code_url    text,
  created_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caixa_created_at      ON caixa_transacoes(created_at);
CREATE INDEX IF NOT EXISTS idx_caixa_payment_method  ON caixa_transacoes(payment_method);
CREATE INDEX IF NOT EXISTS idx_caixa_donor_id        ON caixa_transacoes(donor_id);
CREATE INDEX IF NOT EXISTS idx_caixa_receipt_number  ON caixa_transacoes(receipt_number);

ALTER TABLE caixa_transacoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caixa_transacoes' AND policyname = 'Leitura autenticada caixa') THEN
    CREATE POLICY "Leitura autenticada caixa" ON caixa_transacoes FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caixa_transacoes' AND policyname = 'Inserção autenticada caixa') THEN
    CREATE POLICY "Inserção autenticada caixa" ON caixa_transacoes FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caixa_transacoes' AND policyname = 'Atualização autenticada caixa') THEN
    CREATE POLICY "Atualização autenticada caixa" ON caixa_transacoes FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 5. CAIXA DE DOAÇÕES — FECHAMENTO DIÁRIO
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS caixas_dia (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data            date NOT NULL UNIQUE,
  total_dinheiro  numeric(12,2) DEFAULT 0,
  total_pix       numeric(12,2) DEFAULT 0,
  total_cartao    numeric(12,2) DEFAULT 0,
  total_boleto    numeric(12,2) DEFAULT 0,
  total_geral     numeric(12,2) DEFAULT 0,
  qtd_transacoes  integer DEFAULT 0,
  fechado_por     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  fechado_em      timestamptz,
  status          text DEFAULT 'aberto' CHECK (status IN ('aberto','fechado')),
  observacoes     text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE caixas_dia ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caixas_dia' AND policyname = 'Acesso caixas_dia') THEN
    CREATE POLICY "Acesso caixas_dia" ON caixas_dia
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 6. RECIBO AUTOMÁTICO — FUNÇÕES E TRIGGER
-- ────────────────────────────────────────────────────────────

-- Gera o número sequencial do recibo (DOA-YYYY-NNNNNN)
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS text AS $$
DECLARE
  v_year text := to_char(now(), 'YYYY');
  v_seq  bigint;
BEGIN
  SELECT COALESCE(
    MAX(CAST(split_part(receipt_number, '-', 3) AS bigint)), 0
  ) + 1
  INTO v_seq
  FROM caixa_transacoes
  WHERE receipt_number LIKE 'DOA-' || v_year || '-%';

  RETURN 'DOA-' || v_year || '-' || LPAD(v_seq::text, 6, '0');
END;
$$ LANGUAGE plpgsql;


-- Trigger: gera receipt_number e validation_hash antes de cada INSERT
CREATE OR REPLACE FUNCTION fn_gerar_recibo()
RETURNS TRIGGER AS $$
DECLARE
  v_receipt text;
  v_hash    text;
BEGIN
  v_receipt := generate_receipt_number();
  NEW.receipt_number := v_receipt;

  v_hash := encode(
    digest(
      v_receipt ||
      COALESCE(NEW.donor_id::text, '') ||
      NEW.amount::text ||
      to_char(now(), 'YYYY-MM-DD'),
      'sha256'
    ),
    'hex'
  );
  NEW.validation_hash := v_hash;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gerar_recibo ON caixa_transacoes;
CREATE TRIGGER trg_gerar_recibo
  BEFORE INSERT ON caixa_transacoes
  FOR EACH ROW EXECUTE FUNCTION fn_gerar_recibo();


-- ────────────────────────────────────────────────────────────
-- 7. DOAÇÕES FÍSICAS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doacoes_fisicas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id     integer REFERENCES donors(id) ON DELETE SET NULL,
  donor_name   text NOT NULL DEFAULT 'Anônimo',
  tipo_doacao  text NOT NULL CHECK (tipo_doacao IN (
                 'cabelo','fraldas_geriatricas','alimentos','remedios',
                 'veiculo','terreno','casa','predio_comercial','outro'
               )),
  subtipo      text,
  descricao    text,
  quantidade   text,
  status       text NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente','recebido','cancelado')),
  observacoes  text,
  created_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now(),
  recebido_em  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_doacoes_fisicas_donor  ON doacoes_fisicas(donor_id);
CREATE INDEX IF NOT EXISTS idx_doacoes_fisicas_tipo   ON doacoes_fisicas(tipo_doacao);
CREATE INDEX IF NOT EXISTS idx_doacoes_fisicas_status ON doacoes_fisicas(status);

ALTER TABLE doacoes_fisicas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doacoes_fisicas' AND policyname = 'Acesso doacoes_fisicas') THEN
    CREATE POLICY "Acesso doacoes_fisicas" ON doacoes_fisicas
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 8. STORAGE — BUCKET DE LOGOS
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Upload autenticado') THEN
    CREATE POLICY "Upload autenticado" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Leitura pública logos') THEN
    CREATE POLICY "Leitura pública logos" ON storage.objects
      FOR SELECT TO public USING (bucket_id = 'logos');
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- FIM DO SCRIPT
-- ────────────────────────────────────────────────────────────
