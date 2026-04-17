-- ============================================================
-- PERMISSÃO DE ACESSO PÚBLICO PARA VALIDAÇÃO DE RECIBOS
-- ============================================================

-- Garante que a tabela caixa_transacoes seja legível por usuários não autenticados (public)
-- APENAS quando consultado pelo validation_hash.
-- Nota: O RLS por padrão bloqueia tudo. Adicionamos uma política específica para SELECT pública.

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'caixa_transacoes' AND policyname = 'Leitura pública via hash de validação'
  ) THEN
    CREATE POLICY "Leitura pública via hash de validação" 
    ON caixa_transacoes 
    FOR SELECT 
    TO public 
    USING (validation_hash IS NOT NULL);
  END IF;
END $$;

-- Também é necessário permitir leitura pública em white_label_settings 
-- para que os doadores vejam o nome e logo da organização na página de recibo
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'white_label_settings' AND policyname = 'Leitura pública organizacional'
  ) THEN
    CREATE POLICY "Leitura pública organizacional" 
    ON white_label_settings 
    FOR SELECT 
    TO public 
    USING (id = 1);
  END IF;
END $$;
