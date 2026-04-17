-- ============================================================
-- TABELA DE LOGS PARA AUDITORIA
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  user_name    text,
  user_email   text,
  action       text NOT NULL, -- Ex: 'UPDATE_WHITE_LABEL', 'CLOSE_CASHIER'
  resource     text,          -- Ex: 'configuracoes', 'caixa'
  resource_id  text,          -- Ex: ID da transação ou 'settings'
  details      jsonb,         -- Dados do payload ou antes/depois
  ip_address   text,
  created_at   timestamptz DEFAULT now()
);

-- Habilita RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Apenas administradores podem ler os logs
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Leitura restrita a admins') THEN
    CREATE POLICY "Leitura restrita a admins" ON audit_logs
      FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- Política: Qualquer usuário autenticado pode inserir logs (o backend que decide o que logar)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Inserção autenticada logs') THEN
    CREATE POLICY "Inserção autenticada logs" ON audit_logs
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
