-- ============================================================
-- Fix: Enable REPLICA IDENTITY FULL for Realtime filtering
-- Run this in Supabase SQL Editor
-- ============================================================

-- Without REPLICA IDENTITY FULL, Supabase Realtime cannot filter
-- by column values (e.g. chat_id=eq.xxx) on INSERT events.
ALTER TABLE whatsapp_messages REPLICA IDENTITY FULL;
ALTER TABLE whatsapp_chats REPLICA IDENTITY FULL;

-- Ensure tables are in the Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_chats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_chats;
  END IF;
END;
$$;

-- Verify setup (check output below):
SELECT tablename, pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('whatsapp_messages', 'whatsapp_chats');
