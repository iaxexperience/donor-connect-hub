-- ============================================================
-- Migration: Unificar Sincronização WhatsApp (Nono Dígito)
-- Description: Normaliza números em whatsapp_chats e unifica duplicados.
-- Date: 2026-04-15
-- ============================================================

DO $$
DECLARE
    r RECORD;
    v_normalized TEXT;
    v_target_id UUID;
BEGIN
    RAISE NOTICE 'Iniciando normalização de chats...';

    -- Loop por todos os chats que parecem ser brasileiros (baseado no DDI 55)
    FOR r IN (SELECT id, telefone FROM whatsapp_chats WHERE telefone LIKE '55%') LOOP
        
        -- Lógica de Normalização: DDI 55 + DDD (2 dígitos) + Últimos 8 dígitos
        -- Isso remove o 9º dígito se ele estiver presente.
        IF r.telefone ~ '^55\d{10,11}$' THEN
            v_normalized := '55' || substring(r.telefone FROM '^55(\d{2})') || right(r.telefone, 8);
            
            -- Se o número já estava normalizado, não fazemos nada
            IF v_normalized = r.telefone THEN
                CONTINUE;
            END IF;

            RAISE NOTICE 'Normalizando % -> %', r.telefone, v_normalized;

            -- Verifica se já existe um chat com o número já normalizado
            SELECT id INTO v_target_id FROM whatsapp_chats WHERE telefone = v_normalized AND id != r.id;

            IF v_target_id IS NOT NULL THEN
                RAISE NOTICE 'Fundindo chat % no chat existente %', r.id, v_target_id;
                
                -- 1. Transfere mensagens para o chat "alvo"
                -- Usamos ON CONFLICT DO NOTHING caso existam mensagens com o mesmo message_id (raro mas possível)
                UPDATE whatsapp_messages SET chat_id = v_target_id WHERE chat_id = r.id;
                
                -- 2. Transfere histórico
                -- Note: whatsapp_historicos usa o campo 'destinatario' (texto), vamos normalizar ele também
                UPDATE whatsapp_historicos SET destinatario = v_normalized WHERE destinatario = r.telefone;

                -- 3. Remove o chat duplicado (o que não estava normalizado)
                DELETE FROM whatsapp_chats WHERE id = r.id;
            ELSE
                -- Se não existe duplicata, apenas atualiza o número do chat atual
                UPDATE whatsapp_chats SET telefone = v_normalized WHERE id = r.id;
            END IF;
        END IF;
    END LOOP;

    -- Extra: Normalizar mensagens avulsas que possam ter telefone sem chat (raro)
    UPDATE whatsapp_messages 
    SET telefone = '55' || substring(telefone FROM '^55(\d{2})') || right(telefone, 8)
    WHERE telefone ~ '^55\d{11}$';

    RAISE NOTICE 'Normalização concluída com sucesso.';
END;
$$;
