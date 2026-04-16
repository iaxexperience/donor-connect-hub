-- Migração: Criação da tabela de configurações White Label
-- Execute este SQL no editor do seu banco de dados (Supabase Dashboard > SQL Editor)

CREATE TABLE IF NOT EXISTS white_label_settings (
    id integer PRIMARY KEY DEFAULT 1,
    system_name text DEFAULT 'Pulse Doações',
    primary_color text DEFAULT '#0066CC',
    secondary_color text DEFAULT '#2a9d8f',
    logo_url text,
    cnpj text,
    phone text,
    email text,
    address text,
    opening_time text,
    closing_time text,
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT only_one_row CHECK (id = 1)
);

-- Insere o registro padrão se não existir
INSERT INTO white_label_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;
