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

-- Habilitar pg_cron (Requer permissões de superusuário ou estar em ambiente Supabase Cloud)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar execução a cada 5 minutos (Ajuste o servidor para o seu fuso horário se necessário)
-- SELECT cron.schedule('*/5 * * * *', 'SELECT net.http_post(
--     url:=''https://[PROJ_ID].supabase.co/functions/v1/process-followups'',
--     headers:=''{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}''::jsonb
-- )');
