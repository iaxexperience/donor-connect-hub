-- ============================================================
--  MIGRATION: Criação da Tabela de Setores e Coordenadores
-- ============================================================

CREATE TABLE IF NOT EXISTS setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  coordenador_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  coordenador_nome text NOT NULL,
  coordenador_email text,
  coordenador_telefone text,
  ramal text,
  cor text DEFAULT '#0066CC',
  status text DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilita Row Level Security (RLS)
ALTER TABLE setores ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'setores' AND policyname = 'Leitura setores') THEN
    CREATE POLICY "Leitura setores" ON setores FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'setores' AND policyname = 'Inserção setores') THEN
    CREATE POLICY "Inserção setores" ON setores FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'setores' AND policyname = 'Atualização setores') THEN
    CREATE POLICY "Atualização setores" ON setores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'setores' AND policyname = 'Exclusão setores') THEN
    CREATE POLICY "Exclusão setores" ON setores FOR DELETE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'setores' AND policyname = 'Leitura anon setores') THEN
    CREATE POLICY "Leitura anon setores" ON setores FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'setores' AND policyname = 'Inserção anon setores') THEN
    CREATE POLICY "Inserção anon setores" ON setores FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_setores_status ON setores(status);
CREATE INDEX IF NOT EXISTS idx_setores_coordenador ON setores(coordenador_id);

-- Vínculo de destinação da doação física com o setor responsável
ALTER TABLE doacoes_fisicas ADD COLUMN IF NOT EXISTS setor_id uuid;
ALTER TABLE doacoes_fisicas ADD COLUMN IF NOT EXISTS setor_destino text;
