-- ============================================================
-- Migration: WhatsApp / Meta API Tables
-- Run this in Supabase SQL Editor
-- Date: 2026-04-14
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. whatsapp_settings
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id              int PRIMARY KEY DEFAULT 1,
  waba_id         text,
  phone_number_id text,
  access_token    text,
  webhook_url     text,
  updated_at      timestamptz DEFAULT now(),
  CONSTRAINT whatsapp_settings_single_row CHECK (id = 1)
);

ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS waba_id text;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS phone_number_id text;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS access_token text;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS webhook_url text;
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ──────────────────────────────────────────────────────────────
-- 2. whatsapp_chats
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_chats (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone        text NOT NULL UNIQUE,
  nome            text NOT NULL DEFAULT 'Contato',
  last_message    text,
  last_message_at timestamptz DEFAULT now(),
  unread_count    int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS donor_id bigint REFERENCES donors(id) ON DELETE SET NULL;
ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS last_message text;
ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS last_message_at timestamptz DEFAULT now();
ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS unread_count int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_telefone        ON whatsapp_chats(telefone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_last_message_at ON whatsapp_chats(last_message_at DESC);

-- ──────────────────────────────────────────────────────────────
-- 3. whatsapp_messages
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     uuid REFERENCES whatsapp_chats(id) ON DELETE CASCADE,
  is_from_me  boolean NOT NULL DEFAULT true,
  status      text NOT NULL DEFAULT 'sent'
              CHECK (status IN ('sent','delivered','read','failed','received')),
  created_at  timestamptz DEFAULT now()
);

-- Colunas de Compatibilidade (Código Atual + Pedido Usuário)
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS donor_id bigint REFERENCES donors(id) ON DELETE SET NULL;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS telefone text;          -- Nome em PT (Código)
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS conversation_id uuid;    -- Pedido Usuário (Alias p/ chat_id)
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS message text;             -- Pedido Usuário (Alias p/ text_body)
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS text_body text;           -- Nome no Código
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS sender text;              -- Pedido Usuário
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS sender_id text;           -- Nome no Código
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS message_id text;          -- Nome no Código
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent';
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Trigger para manter aliases sincronizados (Opcional, mas ajuda se o usuário usar ambos)
-- Para simplificar agora, apenas garantimos que a Edge Function use os nomes que ela já conhece.

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat_id    ON whatsapp_messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_message_id ON whatsapp_messages(message_id);

-- ──────────────────────────────────────────────────────────────
-- 4. whatsapp_historicos
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_historicos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_historicos ADD COLUMN IF NOT EXISTS donor_id bigint REFERENCES donors(id) ON DELETE SET NULL;
ALTER TABLE whatsapp_historicos ADD COLUMN IF NOT EXISTS template text;
ALTER TABLE whatsapp_historicos ADD COLUMN IF NOT EXISTS mensagem text;
ALTER TABLE whatsapp_historicos ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent';
ALTER TABLE whatsapp_historicos ADD COLUMN IF NOT EXISTS lote uuid;            -- Nome em PT (Código)
ALTER TABLE whatsapp_historicos ADD COLUMN IF NOT EXISTS batch_id uuid;        -- Nome original
ALTER TABLE whatsapp_historicos ADD COLUMN IF NOT EXISTS message_id text;       -- Nome no Código
ALTER TABLE whatsapp_historicos ADD COLUMN IF NOT EXISTS meta_msg_id text;      -- Nome original

CREATE INDEX IF NOT EXISTS idx_whatsapp_historicos_donor_id    ON whatsapp_historicos(donor_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_historicos_created_at  ON whatsapp_historicos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_historicos_lote        ON whatsapp_historicos(lote);

-- ──────────────────────────────────────────────────────────────
-- 5. whatsapp_templates
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'pt_BR';
ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PENDING';
ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS components jsonb;
ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates(status);

-- ──────────────────────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────────────────────
ALTER TABLE whatsapp_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats       ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_historicos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_whatsapp_settings" ON whatsapp_settings;
CREATE POLICY "auth_select_whatsapp_settings" ON whatsapp_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_upsert_whatsapp_settings" ON whatsapp_settings;
CREATE POLICY "auth_upsert_whatsapp_settings" ON whatsapp_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_whatsapp_chats" ON whatsapp_chats;
CREATE POLICY "auth_all_whatsapp_chats" ON whatsapp_chats FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_whatsapp_messages" ON whatsapp_messages;
CREATE POLICY "auth_all_whatsapp_messages" ON whatsapp_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_whatsapp_historicos" ON whatsapp_historicos;
CREATE POLICY "auth_all_whatsapp_historicos" ON whatsapp_historicos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_whatsapp_templates" ON whatsapp_templates;
CREATE POLICY "auth_all_whatsapp_templates" ON whatsapp_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- Enable Realtime
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_chats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_chats;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
  END IF;
END;
$$;
