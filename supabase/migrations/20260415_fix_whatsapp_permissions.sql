-- ============================================================
-- Fix WhatsApp Webhook Permissions
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Garante que o service_role tenha acesso total (usado pela Edge Function com a KEY)
GRANT ALL ON TABLE whatsapp_messages TO service_role;
GRANT ALL ON TABLE whatsapp_chats TO service_role;

-- 2. Permite que o Webhook insira novas mensagens e atualize chats mesmo que a KEY não esteja configurada
-- NOTA: O Webhook é validado pela estrutura do corpo da Meta API
DROP POLICY IF EXISTS "allow_anon_insert_messages" ON whatsapp_messages;
CREATE POLICY "allow_anon_insert_messages" ON whatsapp_messages FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "allow_anon_select_messages" ON whatsapp_messages;
CREATE POLICY "allow_anon_select_messages" ON whatsapp_messages FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "allow_anon_upsert_chats" ON whatsapp_chats;
CREATE POLICY "allow_anon_upsert_chats" ON whatsapp_chats FOR ALL TO anon USING (true) WITH CHECK (true);
