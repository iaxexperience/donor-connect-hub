-- 1. Adicionar colunas faltantes em caixa_transacoes
ALTER TABLE caixa_transacoes ADD COLUMN IF NOT EXISTS receipt_number text;
ALTER TABLE caixa_transacoes ADD COLUMN IF NOT EXISTS validation_hash text;
ALTER TABLE caixa_transacoes ADD COLUMN IF NOT EXISTS cartao_tipo text;

-- 2. Criar índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_caixa_validation_hash ON caixa_transacoes(validation_hash);

-- 3. Função para gerar hash aleatório (nanoid simplificado)
DROP FUNCTION IF EXISTS generate_validation_hash();
CREATE OR REPLACE FUNCTION generate_validation_hash() RETURNS text AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer := 0;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Função para gerar número do recibo (DOA-YYYY-NNNNNN)
DROP FUNCTION IF EXISTS generate_receipt_number() CASCADE;
CREATE OR REPLACE FUNCTION generate_receipt_number() RETURNS trigger AS $$
DECLARE
  year_prefix text;
  next_val integer;
BEGIN
  year_prefix := 'DOA-' || to_char(now(), 'YYYY') || '-';
  
  -- Busca o próximo número para o ano atual
  SELECT count(*) + 1 INTO next_val 
  FROM caixa_transacoes 
  WHERE receipt_number LIKE year_prefix || '%';
  
  NEW.receipt_number := year_prefix || lpad(next_val::text, 6, '0');
  
  -- Também gera o hash se estiver nulo
  IF NEW.validation_hash IS NULL THEN
    NEW.validation_hash := generate_validation_hash();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para automatizar geração no INSERT
DROP TRIGGER IF EXISTS trg_generate_receipt_info ON caixa_transacoes;
CREATE TRIGGER trg_generate_receipt_info
BEFORE INSERT ON caixa_transacoes
FOR EACH ROW
EXECUTE FUNCTION generate_receipt_number();

-- 6. Criar bucket de storage para recibos (se não existir)
-- Nota: Supabase Storage deve ser configurado via painel ou via SQL se o usuário tiver permissão.
-- Tentativa de criação via SQL (pode falhar se não houver permissão, mas é a melhor opção)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket (permitir upload autenticado e leitura pública)
CREATE POLICY "Leitura pública de recibos" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Upload autenticado de recibos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');
