-- 1. Tabela de Chats (Agrupamento de conversas)
CREATE TABLE IF NOT EXISTS whatsapp_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone TEXT UNIQUE NOT NULL,
    nome TEXT,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabela de Mensagens (Vínculo com chats)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES whatsapp_chats(id) ON DELETE CASCADE,
    telefone TEXT NOT NULL,
    text_body TEXT,
    media_url TEXT,
    is_from_me BOOLEAN DEFAULT false,
    message_id TEXT,
    status TEXT DEFAULT 'sent', -- sent, delivered, read, received
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabela de Históricos (Logs de disparos em lote/individuais)
CREATE TABLE IF NOT EXISTS whatsapp_historicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id BIGINT REFERENCES donors(id) ON DELETE SET NULL, -- Ajustado para donor_id
    destinatario TEXT NOT NULL,
    template VARCHAR,
    mensagem TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'sent', -- 'sent' | 'error'
    lote VARCHAR,
    erro_mensagem TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Tabela de Templates Locais
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar Realtime para as tabelas de chat
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- RLS (Habilitar para todos por enquanto para facilitar testes, ajustar conforme necessário)
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_historicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON whatsapp_chats FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON whatsapp_messages FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON whatsapp_historicos FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON whatsapp_templates FOR ALL TO authenticated USING (true);
