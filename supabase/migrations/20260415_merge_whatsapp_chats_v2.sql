-- ============================================================
-- WhatsApp Chat Consolidation Script (V2)
-- Run this in the Supabase SQL Editor
-- This script merges split chats and normalizes all phone numbers
-- ============================================================

DO $$
DECLARE
    r RECORD;
    canonical_phone text;
    canonical_id uuid;
    duplicate_count int := 0;
BEGIN
    -- 1. Create a function locally to normalize (matching our JS/TS logic)
    -- We'll use this within the script to identify duplicates
    RAISE NOTICE 'Starting WhatsApp Chat Merge...';

    FOR r IN (
        SELECT id, telefone, nome 
        FROM whatsapp_chats
    ) LOOP
        -- Simple Normalization in SQL
        -- a. Keep only digits
        canonical_phone := regexp_replace(r.telefone, '\D', '', 'g');
        
        -- b. Handle multiple 55s at start (recursive-like via regex)
        -- Remove prefix 55 repeatedly if more than 11 digits
        WHILE length(canonical_phone) > 11 AND canonical_phone LIKE '5555%' LOOP
            canonical_phone := substr(canonical_phone, 3);
        END LOOP;
        
        -- c. Format to 55 + DD + last 8 digits
        IF length(canonical_phone) >= 12 AND canonical_phone LIKE '55%' THEN
            canonical_phone := '55' || substr(canonical_phone, 3, 2) || right(canonical_phone, 8);
        ELSIF length(canonical_phone) BETWEEN 10 AND 11 THEN
            canonical_phone := '55' || left(canonical_phone, 2) || right(canonical_phone, 8);
        END IF;

        -- 2. Check if this is the "official" record for this canonical phone
        -- If it's not the one with the latest last_message_at for this phone, we merge it into the latest one.
        
        SELECT id INTO canonical_id
        FROM whatsapp_chats
        WHERE 
            (
                telefone = canonical_phone OR 
                regexp_replace(telefone, '\D', '', 'g') = canonical_phone OR
                (
                    length(regexp_replace(telefone, '\D', '', 'g')) >= 12 AND 
                    '55' || substr(regexp_replace(telefone, '\D', '', 'g'), 3, 2) || right(regexp_replace(telefone, '\D', '', 'g'), 8) = canonical_phone
                )
            )
        ORDER BY last_message_at DESC NULLS LAST, created_at DESC
        LIMIT 1;

        IF canonical_id IS NOT NULL AND canonical_id <> r.id THEN
            -- Merge!
            RAISE NOTICE 'Merging chat % (%) into canonical % (%)', r.telefone, r.id, canonical_phone, canonical_id;
            
            -- Move messages
            UPDATE whatsapp_messages SET chat_id = canonical_id WHERE chat_id = r.id;
            
            -- Move historic entries
            UPDATE whatsapp_historicos SET lote = canonical_id::uuid WHERE lote::text = r.id::text;
            
            -- Delete the duplicate chat
            DELETE FROM whatsapp_chats WHERE id = r.id;
            
            duplicate_count := duplicate_count + 1;
        ELSE
            -- No merge needed or this IS the canonical one
            -- Just update its phone to the normalized version
            UPDATE whatsapp_chats SET telefone = canonical_phone WHERE id = r.id;
        END IF;

    END LOOP;

    RAISE NOTICE 'Cleanup complete. Merged % duplicate records.', duplicate_count;
END $$;
