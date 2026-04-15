-- ============================================================
-- WhatsApp Message ID Unique Constraint Fix
-- This allows the 'upsert' operation in the Proxy to work.
-- ============================================================

-- 1. Remove Any Duplicates Before Adding the Constraint
-- Keeping only the newest record if duplicates exist
DELETE FROM whatsapp_messages
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY message_id ORDER BY created_at DESC) as row_num
        FROM whatsapp_messages
        WHERE message_id IS NOT NULL
    ) t
    WHERE t.row_num > 1
);

-- 2. Add Unique Constraint to message_id
ALTER TABLE whatsapp_messages
DROP CONSTRAINT IF EXISTS whatsapp_messages_message_id_key;

-- We also drop any existing index that might conflict with the name
DROP INDEX IF EXISTS idx_whatsapp_messages_message_id;

-- Create the Unique Index
CREATE UNIQUE INDEX idx_whatsapp_messages_message_id_unique ON whatsapp_messages(message_id);

-- Optional: Add a named constraint for better error handling in code
ALTER TABLE whatsapp_messages 
ADD CONSTRAINT whatsapp_messages_message_id_unique_key UNIQUE USING INDEX idx_whatsapp_messages_message_id_unique;

COMMENT ON CONSTRAINT whatsapp_messages_message_id_unique_key ON whatsapp_messages IS 'Garante que duplicados da Meta sejam ignorados pelo upsert no proxy';
