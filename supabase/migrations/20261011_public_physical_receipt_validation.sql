-- ============================================================
-- LEITURA PÚBLICA PARA VALIDAÇÃO DE RECIBOS DE DOAÇÃO FÍSICA
-- ============================================================
-- A tabela doacoes_fisicas só permite SELECT para usuários autenticados
-- (ver 20260416_doacoes_fisicas.sql). Para a página pública de validação
-- (/validate-receipt/:id, acessada via QR code impresso no recibo) expor
-- só o necessário, criamos uma view com as colunas seguras e liberamos
-- SELECT nela para "anon" — sem expor observações internas, donor_id, etc.

CREATE OR REPLACE VIEW public_doacoes_fisicas_receipt AS
SELECT id, donor_name, tipo_doacao, subtipo, quantidade, setor_destino, status, created_at
FROM doacoes_fisicas;

GRANT SELECT ON public_doacoes_fisicas_receipt TO anon, authenticated;
