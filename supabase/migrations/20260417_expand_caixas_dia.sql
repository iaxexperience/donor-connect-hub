-- ============================================================
-- ATUALIZAÇÃO DA TABELA CAIXAS_DIA E RLS
-- ============================================================

-- Adiciona coluna de saldo inicial (troco)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'caixas_dia' AND column_name = 'saldo_inicial') THEN
    ALTER TABLE caixas_dia ADD COLUMN saldo_inicial numeric(12,2) DEFAULT 0;
  END IF;
END $$;

-- Garante RLS na tabela caixas_dia
ALTER TABLE caixas_dia ENABLE ROW LEVEL SECURITY;

-- Política para leitura
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caixas_dia' AND policyname = 'Leitura autenticada caixas_dia') THEN
    CREATE POLICY "Leitura autenticada caixas_dia" ON caixas_dia FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Política para inserção (abertura)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caixas_dia' AND policyname = 'Inserção autenticada caixas_dia') THEN
    CREATE POLICY "Inserção autenticada caixas_dia" ON caixas_dia FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- Política para atualização (fechamento)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caixas_dia' AND policyname = 'Atualização autenticada caixas_dia') THEN
    CREATE POLICY "Atualização autenticada caixas_dia" ON caixas_dia FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;
