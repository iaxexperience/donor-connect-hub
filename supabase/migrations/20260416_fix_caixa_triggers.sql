-- Remove triggers conflitantes
DROP TRIGGER IF EXISTS trg_generate_receipt_info ON caixa_transacoes;
DROP TRIGGER IF EXISTS trg_gerar_recibo ON caixa_transacoes;

-- Remove funções antigas para recriar sem conflito
DROP FUNCTION IF EXISTS generate_receipt_number() CASCADE;
DROP FUNCTION IF EXISTS fn_gerar_recibo() CASCADE;

-- Função auxiliar: retorna o próximo número de recibo (texto)
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS text AS $$
DECLARE
  v_year text := to_char(now(), 'YYYY');
  v_seq  bigint;
BEGIN
  SELECT COALESCE(
    MAX(CAST(NULLIF(split_part(receipt_number, '-', 3), '') AS bigint)),
    0
  ) + 1
  INTO v_seq
  FROM caixa_transacoes
  WHERE receipt_number LIKE 'DOA-' || v_year || '-%';

  RETURN 'DOA-' || v_year || '-' || LPAD(v_seq::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Função trigger: preenche receipt_number e validation_hash no INSERT
CREATE OR REPLACE FUNCTION fn_gerar_recibo()
RETURNS TRIGGER AS $$
DECLARE
  v_receipt text;
  v_hash    text;
  v_chars   text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_result  text := '';
  i         integer;
BEGIN
  -- Número de recibo sequencial
  v_receipt := generate_receipt_number();
  NEW.receipt_number := v_receipt;

  -- Hash de validação (12 chars aleatórios)
  FOR i IN 1..12 LOOP
    v_result := v_result || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
  END LOOP;
  NEW.validation_hash := v_result;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Único trigger de INSERT
CREATE TRIGGER trg_gerar_recibo
  BEFORE INSERT ON caixa_transacoes
  FOR EACH ROW
  EXECUTE FUNCTION fn_gerar_recibo();
