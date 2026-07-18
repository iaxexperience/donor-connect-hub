-- ============================================================
-- Migration: WhatsApp Settings - Verify Token
-- Run this in Supabase SQL Editor
-- Date: 2026-07-18
-- ============================================================

ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS verify_token text;

-- Salvar/atualizar as credenciais da tela "Meta Developer Credentials"
INSERT INTO whatsapp_settings (id, waba_id, phone_number_id, access_token, webhook_url, verify_token)
VALUES (
  1,
  '1482667360249079',
  '1163113510220394',
  '<COLE_AQUI_O_SYSTEM_USER_ACCESS_TOKEN>',
  'https://zljlhlfbtnzbmeaglkll.supabase.co/functions/v1/meta-whatsapp-proxy',
  'pulse2026'
)
ON CONFLICT (id) DO UPDATE SET
  waba_id         = EXCLUDED.waba_id,
  phone_number_id = EXCLUDED.phone_number_id,
  access_token    = EXCLUDED.access_token,
  webhook_url     = EXCLUDED.webhook_url,
  verify_token    = EXCLUDED.verify_token,
  updated_at      = now();
