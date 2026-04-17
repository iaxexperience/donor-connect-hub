-- ============================================================
-- DESBLOQUEIO DE FOLLOW-UPS PARA AUTOMAÇÃO
-- ============================================================

-- Garante que o RLS está ativo
ALTER TABLE IF EXISTS follow_ups ENABLE ROW LEVEL SECURITY;

-- Permite leitura para usuários autenticados
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_ups' AND policyname = 'Leitura follow-ups') THEN
    CREATE POLICY "Leitura follow-ups" ON follow_ups FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Permite atualização para usuários autenticados (CRUCIAL PARA OS KPIs MUDAREM)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_ups' AND policyname = 'Atualização follow-ups') THEN
    CREATE POLICY "Atualização follow-ups" ON follow_ups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Permite inserção para usuários autenticados (para agendamento manual)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_ups' AND policyname = 'Inserção follow-ups') THEN
    CREATE POLICY "Inserção follow-ups" ON follow_ups FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
