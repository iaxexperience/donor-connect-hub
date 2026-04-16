-- Garante que não existam chats duplicados para o mesmo telefone
-- E tenta limpar os existentes antes de aplicar a restrição

-- 1. Remove chats vazios ou duplicados mantendo o mais recente
DELETE FROM whatsapp_chats 
WHERE id NOT IN (
  SELECT DISTINCT ON (telefone) id 
  FROM whatsapp_chats 
  ORDER BY telefone, last_message_at DESC NULLS LAST
);

-- 2. Adiciona restrição de unicidade para o futuro
ALTER TABLE whatsapp_chats ADD CONSTRAINT whatsapp_chats_telefone_unique UNIQUE (telefone);

-- 3. Garante que as mensagens usem o telefone limpo
UPDATE whatsapp_messages SET telefone = (
  CASE 
    WHEN length(telefone) >= 12 AND telefone LIKE '55%' THEN 
      '55' || substring(telefone from 3 for 2) || right(telefone, 8)
    ELSE telefone
  END
);
