-- Tabela de doações físicas
CREATE TABLE IF NOT EXISTS doacoes_fisicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id integer REFERENCES donors(id) ON DELETE SET NULL,
  donor_name text NOT NULL DEFAULT 'Anônimo',
  tipo_doacao text NOT NULL CHECK (tipo_doacao IN (
    'cabelo','fraldas_geriatricas','alimentos','remedios',
    'veiculo','terreno','casa','predio_comercial','outro'
  )),
  subtipo text,
  descricao text,
  quantidade text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','recebido','cancelado')),
  observacoes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  recebido_em timestamptz
);

CREATE INDEX IF NOT EXISTS idx_doacoes_fisicas_donor ON doacoes_fisicas(donor_id);
CREATE INDEX IF NOT EXISTS idx_doacoes_fisicas_tipo ON doacoes_fisicas(tipo_doacao);
CREATE INDEX IF NOT EXISTS idx_doacoes_fisicas_status ON doacoes_fisicas(status);

ALTER TABLE doacoes_fisicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura autenticada doacoes_fisicas" ON doacoes_fisicas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escrita autenticada doacoes_fisicas" ON doacoes_fisicas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
