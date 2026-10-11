-- ============================================================
-- CARTEIRA DE DOADORES: atribuição de doador a um operador de
-- telemarketing. Vínculo simples (sem tabela de histórico — a
-- rastreabilidade de mudanças fica em audit_logs, já existente).
-- ============================================================

ALTER TABLE donors ADD COLUMN IF NOT EXISTS assigned_operator_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_donors_assigned_operator ON donors(assigned_operator_id);

CREATE OR REPLACE FUNCTION public.assign_donor_operator(p_donor_ids integer[], p_operator_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid() AND status = 'Ativo';
  IF v_caller_role NOT IN ('admin', 'coordenador') THEN
    RAISE EXCEPTION 'Apenas administradores e coordenadores podem atribuir doadores a operadores';
  END IF;

  IF p_operator_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_operator_id AND role = 'operador' AND status = 'Ativo'
  ) THEN
    RAISE EXCEPTION 'Operador inválido ou inativo';
  END IF;

  IF p_donor_ids IS NULL OR array_length(p_donor_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos um doador';
  END IF;

  UPDATE donors SET assigned_operator_id = p_operator_id WHERE id = ANY(p_donor_ids);

  INSERT INTO audit_logs (user_id, action, resource, details)
  VALUES (
    auth.uid(),
    'ASSIGN_DONOR_OPERATOR',
    'donors',
    jsonb_build_object('donor_ids', p_donor_ids, 'operator_id', p_operator_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assign_donor_operator(integer[], uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.assign_donor_operator(integer[], uuid) TO authenticated;
