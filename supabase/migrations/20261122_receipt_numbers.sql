-- ============================================================
-- NUMERAÇÃO SEQUENCIAL E ÚNICA DOS RECIBOS
--
-- 1) Caixa (caixa_transacoes.receipt_number, "DOA-AAAA-000001"):
--    antes o número era COUNT(*)+1 — dois lançamentos simultâneos
--    podiam receber o MESMO número. Passa a usar uma SEQUENCE
--    (atômica), que continua a partir do maior número já emitido.
-- 2) Doações físicas (doacoes_fisicas.receipt_number, "RDF-AAAA-000001"):
--    não tinham número (o PDF usava data/hora). Ganham coluna própria,
--    preenchida para as doações antigas em ordem de cadastro e gerada
--    automaticamente nas novas.
-- 3) Índices únicos garantem que nenhum número se repita.
-- Recibo de coleta (receipts.number) já usa sequence — não muda.
-- Idempotente.
-- ============================================================
begin;

-- ── 1. CAIXA ────────────────────────────────────────────────
create sequence if not exists public.caixa_receipt_seq;

-- Continua do maior número já emitido (qualquer ano).
select setval(
  'public.caixa_receipt_seq',
  greatest(
    coalesce((select max(nullif(regexp_replace(receipt_number, '^.*-', ''), '')::bigint)
                from public.caixa_transacoes
               where receipt_number ~ '^DOA-[0-9]{4}-[0-9]+$'), 0),
    1
  ),
  (select count(*) > 0 from public.caixa_transacoes where receipt_number ~ '^DOA-[0-9]{4}-[0-9]+$')
);

create or replace function public.generate_receipt_number() returns text
language sql volatile set search_path = public as $$
  select 'DOA-' || to_char(now() at time zone 'America/Sao_Paulo', 'YYYY') || '-'
         || lpad(nextval('public.caixa_receipt_seq')::text, 6, '0')
$$;

-- Lançamentos antigos sem número recebem um agora.
update public.caixa_transacoes
   set receipt_number = public.generate_receipt_number()
 where receipt_number is null or receipt_number = '';

-- Duplicados antigos (gerados pelo COUNT+1): mantém o mais antigo e renumera os demais.
with dup as (
  select id, row_number() over (partition by receipt_number order by created_at, id) as rn
    from public.caixa_transacoes
)
update public.caixa_transacoes c
   set receipt_number = public.generate_receipt_number()
  from dup
 where dup.id = c.id and dup.rn > 1;

create unique index if not exists caixa_transacoes_receipt_number_key
  on public.caixa_transacoes (receipt_number);

-- ── 2. DOAÇÕES FÍSICAS ──────────────────────────────────────
alter table public.doacoes_fisicas add column if not exists receipt_number text;
create sequence if not exists public.doacao_fisica_receipt_seq;

create or replace function public.generate_physical_receipt_number(p_at timestamptz default now()) returns text
language sql volatile set search_path = public as $$
  select 'RDF-' || to_char(coalesce(p_at, now()) at time zone 'America/Sao_Paulo', 'YYYY') || '-'
         || lpad(nextval('public.doacao_fisica_receipt_seq')::text, 6, '0')
$$;

-- Numera as doações antigas em ordem de cadastro.
do $$
declare r record;
begin
  for r in select id, created_at from public.doacoes_fisicas
            where receipt_number is null or receipt_number = ''
            order by created_at, id
  loop
    update public.doacoes_fisicas
       set receipt_number = public.generate_physical_receipt_number(r.created_at)
     where id = r.id;
  end loop;
end $$;

create or replace function public.fn_doacao_fisica_receipt_number() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.receipt_number is null or new.receipt_number = '' then
    new.receipt_number := public.generate_physical_receipt_number(coalesce(new.created_at, now()));
  end if;
  return new;
end $$;

drop trigger if exists trg_doacao_fisica_receipt_number on public.doacoes_fisicas;
create trigger trg_doacao_fisica_receipt_number
  before insert on public.doacoes_fisicas
  for each row execute function public.fn_doacao_fisica_receipt_number();

create unique index if not exists doacoes_fisicas_receipt_number_key
  on public.doacoes_fisicas (receipt_number);

commit;
