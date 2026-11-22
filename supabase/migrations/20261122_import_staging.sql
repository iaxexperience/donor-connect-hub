-- ============================================================
-- IMPORTAÇÃO POR EXCEL — área de preparação ("staging").
--
-- Fluxo (ver .claude/skills/importar-excel/SKILL.md):
--   1. A planilha vira linhas em import_rows (um lote = import_batches),
--      sem mexer em donors/donations.
--   2. import_process_batch(lote, true)  → SIMULAÇÃO: valida e mostra o
--      que seria criado/atualizado/rejeitado, sem gravar nada.
--   3. import_process_batch(lote, false) → grava de verdade.
--   Cada linha guarda o resultado (importado/atualizado/ignorado/erro +
--   mensagem), então nada some em silêncio.
--
-- Tipos de lote:
--   'doadores' → cria/atualiza donors. Casa com doador existente por:
--                código legado → CPF/CNPJ → e-mail → telefone.
--   'doacoes'  → cria donations (histórico). Acha o doador pelo mesmo
--                critério; se não achar e a linha tiver nome, cria o
--                doador. Reimportar o mesmo arquivo não duplica (chave).
--
-- Só admin, gestor e coordenador ativos podem importar.
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================
begin;

-- ── Permissão ───────────────────────────────────────────────
create or replace function public.can_import_data() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
     where id = auth.uid() and role in ('admin', 'gestor', 'coordenador') and status = 'Ativo'
  )
  -- SQL Editor do Supabase / scripts com a chave de serviço (sem usuário logado).
  or (auth.uid() is null and session_user in ('postgres', 'supabase_admin', 'service_role'))
  or coalesce(auth.role(), '') = 'service_role'
$$;

-- ── Colunas de rastreio nas tabelas finais ──────────────────
alter table public.donors    add column if not exists legacy_code text;      -- código do doador no sistema antigo
alter table public.donors    add column if not exists import_batch_id uuid;
alter table public.donations add column if not exists import_key text;       -- evita duplicar ao reimportar
alter table public.donations add column if not exists import_batch_id uuid;

create unique index if not exists donors_legacy_code_uidx on public.donors (legacy_code) where legacy_code is not null;
create unique index if not exists donations_import_key_uidx on public.donations (import_key) where import_key is not null;
create index if not exists donors_document_id_idx on public.donors (document_id);
create index if not exists donors_email_lower_idx on public.donors (lower(email));
create index if not exists donors_phone_digits_idx on public.donors ((regexp_replace(coalesce(phone, ''), '\D', '', 'g')));

-- ── Lotes e linhas ──────────────────────────────────────────
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('doadores', 'doacoes')),
  file_name text not null,
  sheet_name text,
  status text not null default 'carregado'
    check (status in ('carregado', 'simulado', 'processado', 'cancelado')),
  total_rows integer not null default 0,
  inserted integer not null default 0,
  updated integer not null default 0,
  skipped integer not null default 0,
  errors integer not null default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.import_rows (
  id bigserial primary key,
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  row_number integer not null,             -- linha na planilha (para achar o erro no Excel)
  data jsonb not null,                     -- colunas já com os nomes padrão (ver SKILL.md)
  status text not null default 'pendente'
    check (status in ('pendente', 'importado', 'atualizado', 'ignorado', 'erro')),
  message text,
  target_id text,                          -- id do doador ou da doação gerada
  unique (batch_id, row_number)
);
create index if not exists import_rows_batch_status_idx on public.import_rows (batch_id, status);

alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;
drop policy if exists import_batches_managers on public.import_batches;
drop policy if exists import_rows_managers on public.import_rows;
create policy import_batches_managers on public.import_batches for all to authenticated
  using (public.can_import_data()) with check (public.can_import_data());
create policy import_rows_managers on public.import_rows for all to authenticated
  using (public.can_import_data()) with check (public.can_import_data());
revoke all on public.import_batches, public.import_rows from anon;
grant select, insert, update, delete on public.import_batches, public.import_rows to authenticated;
grant usage, select on sequence public.import_rows_id_seq to authenticated;

-- ── Funções de limpeza dos valores da planilha ──────────────
create or replace function public.imp_text(v text) returns text
language sql immutable as $$ select nullif(btrim(regexp_replace(coalesce(v, ''), '\s+', ' ', 'g')), '') $$;

create or replace function public.imp_digits(v text) returns text
language sql immutable as $$ select nullif(regexp_replace(coalesce(v, ''), '\D', '', 'g'), '') $$;

-- "1.234,56" | "1234.56" | "R$ 50" → numeric
create or replace function public.imp_money(v text) returns numeric
language plpgsql immutable as $$
declare s text := regexp_replace(coalesce(v, ''), '[^0-9,.\-]', '', 'g');
begin
  if s = '' then return null; end if;
  if s ~ ',\d{1,2}$' then s := replace(replace(s, '.', ''), ',', '.');   -- formato brasileiro
  else s := replace(s, ',', ''); end if;
  return s::numeric;
end $$;

-- "31/12/2025" | "2025-12-31" | "31/12/25" → date
create or replace function public.imp_date(v text) returns date
language plpgsql immutable as $$
declare s text := btrim(coalesce(v, ''));
begin
  if s = '' then return null; end if;
  if s ~ '^\d{4}-\d{2}-\d{2}' then return left(s, 10)::date; end if;
  if s ~ '^\d{1,2}/\d{1,2}/\d{4}$' then return to_date(s, 'DD/MM/YYYY'); end if;
  if s ~ '^\d{1,2}/\d{1,2}/\d{2}$' then return to_date(s, 'DD/MM/YY'); end if;
  raise exception 'Data inválida: "%" (use DD/MM/AAAA)', s;
end $$;

-- "Recorrente" | "ESPORÁDICO" | "unico" → donor_type (texto)
create or replace function public.imp_donor_type(v text) returns text
language sql immutable as $$
  select case translate(lower(btrim(coalesce(v, ''))), 'áéíóúâêôãõç', 'aeiouaeoaoc')
    when '' then null
    when 'lead' then 'lead'
    when 'recorrente' then 'recorrente'
    when 'esporadico' then 'esporadico'
    when 'unico' then 'unico'
    when 'desativado' then 'desativado'
    when 'inativo' then 'desativado'
    else null
  end
$$;

-- Acha o doador da linha: código legado → CPF/CNPJ → e-mail → telefone.
create or replace function public.imp_find_donor(d jsonb) returns bigint
language plpgsql stable set search_path = public as $$
declare
  v_id bigint;
  v_doc text := public.imp_digits(d->>'cpf_cnpj');
  v_email text := lower(public.imp_text(d->>'email'));
  v_phone text := public.imp_digits(d->>'telefone');
  v_code text := public.imp_text(d->>'codigo');
begin
  if v_code is not null then
    select id into v_id from donors where legacy_code = v_code limit 1;
    if v_id is not null then return v_id; end if;
  end if;
  if v_doc is not null then
    select id into v_id from donors where regexp_replace(coalesce(document_id, ''), '\D', '', 'g') = v_doc limit 1;
    if v_id is not null then return v_id; end if;
  end if;
  if v_email is not null then
    select id into v_id from donors where lower(email) = v_email limit 1;
    if v_id is not null then return v_id; end if;
  end if;
  if v_phone is not null and length(v_phone) >= 10 then
    select id into v_id from donors where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_phone limit 1;
  end if;
  return v_id;
end $$;

-- Operador (para carteira/captação) pelo e-mail ou nome exato.
create or replace function public.imp_find_profile(v text) returns uuid
language sql stable set search_path = public as $$
  select id from profiles
   where public.imp_text(v) is not null
     and (lower(email) = lower(btrim(v)) or lower(name) = lower(btrim(v)))
   order by (lower(email) = lower(btrim(v))) desc
   limit 1
$$;

-- ── Processamento de um lote ────────────────────────────────
create or replace function public.import_process_batch(p_batch uuid, p_dry_run boolean default true)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b import_batches%rowtype;
  r import_rows%rowtype;
  d jsonb;
  v_donor bigint;
  v_new text;
  v_name text;
  v_type text;
  v_amount numeric;
  v_date date;
  v_status text;
  v_key text;
  v_op uuid;
  v_campaign uuid;
  n_ins int := 0; n_upd int := 0; n_skip int := 0; n_err int := 0;
begin
  if not public.can_import_data() then
    raise exception 'Apenas admin, gestor ou coordenador podem importar dados';
  end if;

  select * into b from import_batches where id = p_batch for update;
  if not found then raise exception 'Lote % não encontrado', p_batch; end if;
  if b.status = 'processado' then raise exception 'Este lote já foi processado em %', b.processed_at; end if;

  for r in select * from import_rows where batch_id = p_batch order by row_number loop
    d := r.data;
    begin
      -- Cada linha num "savepoint": erro numa linha não derruba as outras,
      -- e na simulação tudo é desfeito no final da linha.
      v_donor := public.imp_find_donor(d);
      v_name := public.imp_text(d->>'nome');

      if b.kind = 'doadores' then
        v_type := public.imp_donor_type(d->>'tipo');
        if public.imp_text(d->>'tipo') is not null and v_type is null then
          raise exception 'Tipo "%" inválido (use lead, recorrente, esporadico, unico ou desativado)', d->>'tipo';
        end if;
        v_op := public.imp_find_profile(d->>'operador');
        if public.imp_text(d->>'operador') is not null and v_op is null then
          raise exception 'Operador "%" não encontrado em Usuários', d->>'operador';
        end if;

        if v_donor is null then
          if v_name is null then raise exception 'Linha sem nome e sem doador correspondente'; end if;
          insert into donors (name, email, phone, document_id, type, birth_date, zip_code, address,
                              address_number, complement, neighborhood, city, state,
                              legacy_code, assigned_operator_id, import_batch_id, total_donated, donation_count)
          values (v_name,
                  lower(public.imp_text(d->>'email')),
                  coalesce(public.imp_digits(d->>'telefone'), ''),
                  public.imp_digits(d->>'cpf_cnpj'),
                  coalesce(v_type, 'lead')::donor_type,
                  public.imp_date(d->>'data_nascimento'),
                  public.imp_digits(d->>'cep'),
                  public.imp_text(d->>'endereco'),
                  public.imp_text(d->>'numero'),
                  public.imp_text(d->>'complemento'),
                  public.imp_text(d->>'bairro'),
                  public.imp_text(d->>'cidade'),
                  upper(public.imp_text(d->>'uf')),
                  public.imp_text(d->>'codigo'),
                  v_op, p_batch, 0, 0)
          returning id into v_new;
          v_status := 'importado'; n_ins := n_ins + 1;
        else
          -- Só preenche o que veio na planilha; não apaga dado existente.
          update donors set
            name           = coalesce(v_name, name),
            email          = coalesce(lower(public.imp_text(d->>'email')), email),
            phone          = coalesce(public.imp_digits(d->>'telefone'), phone),
            document_id    = coalesce(public.imp_digits(d->>'cpf_cnpj'), document_id),
            type           = coalesce(v_type::donor_type, type),
            birth_date     = coalesce(public.imp_date(d->>'data_nascimento'), birth_date),
            zip_code       = coalesce(public.imp_digits(d->>'cep'), zip_code),
            address        = coalesce(public.imp_text(d->>'endereco'), address),
            address_number = coalesce(public.imp_text(d->>'numero'), address_number),
            complement     = coalesce(public.imp_text(d->>'complemento'), complement),
            neighborhood   = coalesce(public.imp_text(d->>'bairro'), neighborhood),
            city           = coalesce(public.imp_text(d->>'cidade'), city),
            state          = coalesce(upper(public.imp_text(d->>'uf')), state),
            legacy_code    = coalesce(legacy_code, public.imp_text(d->>'codigo')),
            assigned_operator_id = coalesce(v_op, assigned_operator_id)
          where id = v_donor;
          v_new := v_donor; v_status := 'atualizado'; n_upd := n_upd + 1;
        end if;

      else -- 'doacoes'
        v_amount := public.imp_money(d->>'valor');
        if v_amount is null or v_amount <= 0 then raise exception 'Valor inválido: "%"', d->>'valor'; end if;
        v_date := public.imp_date(d->>'data');
        if v_date is null then raise exception 'Linha sem data da doação'; end if;
        v_op := public.imp_find_profile(d->>'operador');
        if public.imp_text(d->>'operador') is not null and v_op is null then
          raise exception 'Operador "%" não encontrado em Usuários', d->>'operador';
        end if;
        select id into v_campaign from campaigns
         where public.imp_text(d->>'campanha') is not null and lower(name) = lower(btrim(d->>'campanha')) limit 1;

        v_key := coalesce(public.imp_text(d->>'chave'),
                          md5(b.file_name || '|' || coalesce(b.sheet_name, '') || '|' || r.row_number));
        if exists (select 1 from donations where import_key = v_key) then
          v_status := 'ignorado'; n_skip := n_skip + 1;
          update import_rows set status = v_status, message = 'Já importada antes (mesma chave)' where id = r.id;
          continue;
        end if;

        if v_donor is null then
          if v_name is null then raise exception 'Doador não encontrado e linha sem nome para cadastrá-lo'; end if;
          insert into donors (name, email, phone, document_id, legacy_code, type, import_batch_id, total_donated, donation_count)
          values (v_name, lower(public.imp_text(d->>'email')), coalesce(public.imp_digits(d->>'telefone'), ''),
                  public.imp_digits(d->>'cpf_cnpj'), public.imp_text(d->>'codigo'), 'lead', p_batch, 0, 0)
          returning id into v_donor;
        end if;

        v_status := lower(coalesce(public.imp_text(d->>'status'), 'pago'));
        if v_status not in ('pago', 'pendente', 'cancelado', 'vencido', 'estornado') then
          raise exception 'Status "%" inválido (use pago, pendente, cancelado, vencido ou estornado)', d->>'status';
        end if;

        -- O gatilho de donations recalcula total, quantidade, última doação e tipo do doador.
        insert into donations (donor_id, amount, status, donation_date, confirmed_at, payment_method,
                               campaign_id, captured_by, notes, source, import_key, import_batch_id)
        values (v_donor, v_amount, v_status,
                (v_date::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo',
                case when v_status = 'pago' then (v_date::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo' end,
                coalesce(public.imp_text(d->>'forma_pagamento'), 'Importação'),
                v_campaign, v_op,
                coalesce(public.imp_text(d->>'observacao'), '[Importação] ' || b.file_name),
                'importacao', v_key, p_batch)
        returning id into v_new;
        v_status := 'importado'; n_ins := n_ins + 1;
      end if;

      if p_dry_run then
        -- Desfaz a gravação desta linha, mantendo o resultado para o relatório.
        raise exception using errcode = 'P0001', message = '__simulacao__:' || v_status;
      end if;
      update import_rows set status = v_status, message = null, target_id = v_new where id = r.id;

    exception when others then
      if sqlerrm like '__simulacao__:%' then
        update import_rows set status = split_part(sqlerrm, ':', 2), message = 'Simulação (nada gravado)'
         where id = r.id;
      else
        n_err := n_err + 1;
        update import_rows set status = 'erro', message = left(sqlerrm, 300) where id = r.id;
      end if;
    end;
  end loop;

  update import_batches set
    status = case when p_dry_run then 'simulado' else 'processado' end,
    inserted = n_ins, updated = n_upd, skipped = n_skip, errors = n_err,
    total_rows = (select count(*) from import_rows where batch_id = p_batch),
    processed_at = case when p_dry_run then null else now() end
  where id = p_batch;

  return jsonb_build_object(
    'lote', p_batch, 'simulacao', p_dry_run,
    'criados', n_ins, 'atualizados', n_upd, 'ignorados', n_skip, 'erros', n_err
  );
end $$;

revoke all on function public.import_process_batch(uuid, boolean) from public, anon;
grant execute on function public.import_process_batch(uuid, boolean) to authenticated;
revoke all on function public.can_import_data() from public, anon;
grant execute on function public.can_import_data() to authenticated;

commit;
