-- ============================================================
-- FILA DO TELEMARKETING por carteira.
--
-- Regra:
--  * Cada operador só vê os doadores da própria carteira
--    (donors.assigned_operator_id).
--  * O doador volta a aparecer quando passa o prazo desde a última
--    doação, conforme o tipo:
--       recorrente → 30 dias · esporádico → 60 dias · único → 90 dias
--    Leads e quem nunca doou aparecem sempre. Desativados nunca.
--  * Quem já recebeu ligação hoje sai da fila do dia.
--  * Quem foi contatado neste ciclo e não doou vai para o FINAL da
--    fila: primeiro quem ainda não recebeu ligação no ciclo, depois
--    quem foi ligado há mais tempo. Se doar, a última doação muda e
--    ele só volta depois do novo prazo.
--
-- A função roda com as permissões de quem chama (RLS de donors vale
-- normalmente). Idempotente.
-- ============================================================
begin;

-- Prazo de retorno por tipo de doador (em dias).
create or replace function public.donor_contact_interval(p_type text)
returns integer language sql immutable as $$
  select case p_type
    when 'recorrente' then 30
    when 'esporadico' then 60
    when 'unico'      then 90
    else 0
  end
$$;

-- Acelera "última ligação de cada doador".
create index if not exists telemarketing_calls_donor_created_idx
  on public.telemarketing_calls (donor_id, created_at desc);
create index if not exists donors_assigned_operator_idx
  on public.donors (assigned_operator_id);

create or replace function public.telemarketing_queue(p_operator uuid default null)
returns setof public.donors
language sql stable set search_path = public as $$
  with hoje as (
    select (now() at time zone 'America/Sao_Paulo')::date as dia
  ),
  calc as (
    select d.id,
           case
             when d.type = 'lead' or d.last_donation_date is null then null
             else d.last_donation_date::date + public.donor_contact_interval(d.type::text)
           end as volta_em,
           (select max(c.created_at) from telemarketing_calls c where c.donor_id = d.id) as ultima_ligacao
      from donors d
     where coalesce(d.type::text, 'lead') <> 'desativado'
       and (p_operator is null or d.assigned_operator_id = p_operator)
  ),
  fila as (
    select c.id, c.volta_em,
           case
             when c.ultima_ligacao is not null
              and (c.volta_em is null
                   or (c.ultima_ligacao at time zone 'America/Sao_Paulo')::date >= c.volta_em)
             then c.ultima_ligacao
           end as ligado_no_ciclo
      from calc c, hoje
     where (c.volta_em is null or c.volta_em <= hoje.dia)
       and (c.ultima_ligacao is null
            or (c.ultima_ligacao at time zone 'America/Sao_Paulo')::date < hoje.dia)
  )
  select d.*
    from fila f
    join donors d on d.id = f.id
   order by f.ligado_no_ciclo asc nulls first,
            f.volta_em asc nulls last,
            f.id asc
$$;

revoke all on function public.telemarketing_queue(uuid) from public, anon;
grant execute on function public.telemarketing_queue(uuid) to authenticated;
grant execute on function public.donor_contact_interval(text) to authenticated;

commit;
