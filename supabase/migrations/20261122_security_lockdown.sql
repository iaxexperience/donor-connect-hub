-- ============================================================
-- BLOQUEIO DE SEGURANÇA — credenciais e dados pessoais
--
-- Problema encontrado em 22/11/2026: com a chave pública (anon) que vai
-- embutida no site, qualquer pessoa conseguia ler sem login:
--   * asaas_settings  (chave de PRODUÇÃO da API do Asaas)
--   * bb_settings     (client_id/secret, app_key, certificado e chave do BB)
--   * profiles, donors, donations, caixa_transacoes, whatsapp_messages...
--
-- O que este script faz:
--  1. Credenciais (asaas_settings, bb_settings): só admin, gestor e
--     coordenador ATIVOS leem/alteram. Edge Functions (service role) seguem
--     funcionando normalmente.
--  2. Visitante sem login (role "anon") perde acesso a TODAS as tabelas do
--     schema public. Exceções:
--       - white_label_settings: leitura (nome/logo da organização no site);
--       - profiles: só INSERT (tela de cadastro, que cria o perfil "Pendente").
--  3. Validação pública de recibo (QR code) passa a usar a função
--     public_validate_receipt(), que devolve SÓ o recibo pedido — no lugar
--     da política que liberava o caixa inteiro e da view que listava todas
--     as doações físicas.
--
-- DEPOIS DE RODAR: troque as chaves do Asaas e do Banco do Brasil (as
-- antigas devem ser consideradas vazadas) e cadastre as novas no sistema.
-- Idempotente.
-- ============================================================
begin;

-- ── 1. Credenciais ──────────────────────────────────────────
create or replace function public.can_manage_integrations() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'gestor', 'coordenador') and status = 'Ativo'
  )
$$;
revoke all on function public.can_manage_integrations() from public, anon;
grant execute on function public.can_manage_integrations() to authenticated;

do $$
declare t text; p record;
begin
  foreach t in array array['asaas_settings', 'bb_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    -- remove qualquer política antiga (algumas liberavam leitura para todos)
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.can_manage_integrations()) with check (public.can_manage_integrations())',
      t || '_managers_only', t
    );
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- ── 2. Nada para visitante sem login, salvo o necessário ────
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

grant select on public.white_label_settings to anon;
grant insert on public.profiles to anon;

-- Política antiga que tornava TODO o caixa público ("validation_hash is not null").
drop policy if exists "Leitura pública via hash de validação" on public.caixa_transacoes;

-- ── 3. Validação pública de recibo, um por vez ──────────────
create or replace function public.public_validate_receipt(p_ref text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if p_ref is null or length(p_ref) < 8 or length(p_ref) > 64 then
    return null;
  end if;

  -- Recibo do caixa (QR code traz o validation_hash)
  select jsonb_build_object(
           'kind', 'caixa',
           'receipt_number', receipt_number,
           'donor_name', donor_name,
           'amount', amount,
           'payment_method', payment_method,
           'cartao_tipo', cartao_tipo,
           'status', status,
           'created_at', created_at)
    into r
    from caixa_transacoes
   where validation_hash = p_ref
   limit 1;
  if r is not null then return r; end if;

  -- Recibo de doação física (QR code traz o id)
  if p_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select jsonb_build_object(
             'kind', 'fisica',
             'receipt_number', receipt_number,
             'donor_name', donor_name,
             'tipo_doacao', tipo_doacao,
             'subtipo', subtipo,
             'quantidade', quantidade,
             'setor_destino', setor_destino,
             'status', status,
             'created_at', created_at)
      into r
      from doacoes_fisicas
     where id = p_ref::uuid
     limit 1;
  end if;

  return r;
end $$;

revoke all on function public.public_validate_receipt(text) from public;
grant execute on function public.public_validate_receipt(text) to anon, authenticated;

commit;
