-- Tabela de transações do caixa de doações
CREATE TABLE IF NOT EXISTS caixa_transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  donor_name text NOT NULL DEFAULT 'Anônimo',
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('dinheiro','pix','cartao','boleto')),
  status text NOT NULL DEFAULT 'confirmado' CHECK (status IN ('confirmado','pendente','cancelado')),
  notes text,
  compensated_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_caixa_created_at ON caixa_transacoes(created_at);
CREATE INDEX IF NOT EXISTS idx_caixa_payment_method ON caixa_transacoes(payment_method);
CREATE INDEX IF NOT EXISTS idx_caixa_donor_id ON caixa_transacoes(donor_id);

-- RLS
ALTER TABLE caixa_transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura autenticada caixa" ON caixa_transacoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inserção autenticada caixa" ON caixa_transacoes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Atualização autenticada caixa" ON caixa_transacoes
  FOR UPDATE TO authenticated USING (true);
