-- ============================================================
-- REPARO DOS TRIGGERS DO CAIXA
-- ============================================================

-- 1. Remover gatilhos e funções conflitantes
DROP TRIGGER IF EXISTS trg_generate_receipt_info ON caixa_transacoes;
DROP TRIGGER IF EXISTS trg_gerar_recibo ON caixa_transacoes;
DROP TRIGGER IF EXISTS trg_gerar_recibo_caixa ON caixa_transacoes;

DROP FUNCTION IF EXISTS generate_receipt_number() CASCADE;
DROP FUNCTION IF EXISTS fn_gerar_recibo() CASCADE;
DROP FUNCTION IF EXISTS fn_gerar_recibo_caixa() CASCADE;
DROP FUNCTION IF EXISTS generate_validation_hash() CASCADE;

-- 2. Função para gerar hash aleatório (retorna texto)
CREATE OR REPLACE FUNCTION generate_validation_hash() 
RETURNS text AS $$
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

-- 3. Função para gerar número do recibo (retorna texto)
CREATE OR REPLACE FUNCTION generate_receipt_number() 
RETURNS text AS $$
DECLARE
  year_prefix text;
  next_val integer;
BEGIN
  year_prefix := 'DOA-' || to_char(now(), 'YYYY') || '-';
  
  -- Busca o próximo número para o ano atual
  -- Usamos o casting para garantir que o split_part funcione se houver dados manuais
  SELECT COALESCE(COUNT(*), 0) + 1 INTO next_val 
  FROM caixa_transacoes 
  WHERE receipt_number LIKE year_prefix || '%';
  
  RETURN year_prefix || lpad(next_val::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 4. Função de GATILHO (Trigger) que preenche as informações antes do INSERT
CREATE OR REPLACE FUNCTION fn_gerar_recibo_caixa() 
RETURNS trigger AS $$
BEGIN
  -- Gera o número do recibo se estiver nulo ou vazio
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := generate_receipt_number();
  END IF;
  
  -- Gera o hash de validação se estiver nulo ou vazio
  IF NEW.validation_hash IS NULL OR NEW.validation_hash = '' THEN
    NEW.validation_hash := generate_validation_hash();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar o gatilho único na tabela caixa_transacoes
CREATE TRIGGER trg_gerar_recibo_caixa
BEFORE INSERT ON caixa_transacoes
FOR EACH ROW
EXECUTE FUNCTION fn_gerar_recibo_caixa();

-- Garantir que as políticas de RLS permitam o insert
-- (Normalmente já estão, mas por segurança)
ALTER TABLE caixa_transacoes ENABLE ROW LEVEL SECURITY;
