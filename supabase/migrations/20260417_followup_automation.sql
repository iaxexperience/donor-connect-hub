-- ============================================================
-- AUTOMAÇÃO DE FOLLOW-UPS
-- ============================================================

-- Tabela para guardar as configurações de automação (antes em localStorage)
CREATE TABLE IF NOT EXISTS follow_up_settings (
    id            integer PRIMARY KEY DEFAULT 1,
    enabled       boolean DEFAULT false,
    rules         jsonb DEFAULT '[
        {"type": "unico", "rule": "1 doação registrada", "followUpDays": 90, "enabled": true, "channel": "whatsapp", "template": "follow_up_primeiro_doador", "sendHour": "10:00"},
        {"type": "esporadico", "rule": "2+ doações em 6 meses", "followUpDays": 60, "enabled": true, "channel": "whatsapp", "template": "follow_up_engajamento", "sendHour": "14:00"},
        {"type": "recorrente", "rule": "3+ doações em 3 meses", "followUpDays": 30, "enabled": true, "channel": "whatsapp", "template": "follow_up_fidelizacao", "sendHour": "09:00"}
    ]'::jsonb,
    updated_at    timestamptz DEFAULT now(),
    CONSTRAINT only_one_config CHECK (id = 1)
);

INSERT INTO follow_up_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Tabela para logs das automações
CREATE TABLE IF NOT EXISTS follow_up_logs (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id     integer REFERENCES donors(id) ON DELETE SET NULL,
    donor_name   text,
    donor_type   text,
    channel      text,
    template     text,
    sent_at      timestamptz DEFAULT now(),
    status       text CHECK (status IN ('enviado', 'falha', 'aguardando')),
    retry_count  integer DEFAULT 0,
    error_message text
);

-- Políticas de Segurança (RLS)
ALTER TABLE follow_up_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_up_settings' AND policyname = 'Acesso follow-up settings') THEN
    CREATE POLICY "Acesso follow-up settings" ON follow_up_settings
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE follow_up_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_up_logs' AND policyname = 'Leitura logs follow-up') THEN
    CREATE POLICY "Leitura logs follow-up" ON follow_up_logs
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_up_logs' AND policyname = 'Inserção logs follow-up') THEN
    CREATE POLICY "Inserção logs follow-up" ON follow_up_logs
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
