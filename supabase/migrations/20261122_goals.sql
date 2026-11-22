-- ============================================================
-- Módulo de METAS (diárias e mensais) para operadores de
-- telemarketing e mensageiros.
--
--  * goal_templates: modelos de meta (sugestões prontas) que o
--    coordenador pode editar, desativar ou criar novos.
--  * goals: meta atribuída a uma pessoa. É recorrente: uma meta
--    "diaria" vale para cada dia e uma "mensal" para cada mês,
--    entre valid_from e valid_until (null = sem fim).
--  * goal_metric_value(): calcula o realizado direto dos dados
--    do sistema (ligações, doações, visitas de rota).
--  * goals_progress(): metas + realizado para um dia de referência.
--
-- Acesso: cada pessoa vê só as próprias metas; admin e coordenador
-- veem todas e são os únicos que criam/alteram metas e modelos.
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================
begin;

-- ── Permissão ───────────────────────────────────────────────
create or replace function public.can_manage_goals() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'coordenador') and status = 'Ativo'
  )
$$;

-- ── Tabelas ─────────────────────────────────────────────────
create table if not exists public.goal_templates (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  description text,
  role text not null check (role in ('operador', 'motoboy')),
  period text not null check (period in ('diaria', 'mensal')),
  metric text not null,
  target numeric(12,2) not null check (target > 0),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  metric text not null,
  period text not null check (period in ('diaria', 'mensal')),
  target numeric(12,2) not null check (target > 0),
  valid_from date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  valid_until date,
  template_id uuid references public.goal_templates(id) on delete set null,
  notes text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from)
);
create index if not exists goals_user_active_idx on public.goals (user_id) where active;

-- ── RLS ─────────────────────────────────────────────────────
alter table public.goal_templates enable row level security;
alter table public.goals enable row level security;

drop policy if exists goal_templates_read on public.goal_templates;
drop policy if exists goal_templates_write on public.goal_templates;
drop policy if exists goals_read on public.goals;
drop policy if exists goals_write on public.goals;

create policy goal_templates_read on public.goal_templates for select to authenticated using (true);
create policy goal_templates_write on public.goal_templates for all to authenticated
  using (public.can_manage_goals()) with check (public.can_manage_goals());

create policy goals_read on public.goals for select to authenticated
  using (user_id = auth.uid() or public.can_manage_goals());
create policy goals_write on public.goals for all to authenticated
  using (public.can_manage_goals()) with check (public.can_manage_goals());

revoke all on public.goal_templates, public.goals from anon;
grant select, insert, update, delete on public.goal_templates, public.goals to authenticated;

-- ── Cálculo do realizado ────────────────────────────────────
create or replace function public.goal_metric_value(p_user uuid, p_metric text, p_start date, p_end date)
returns numeric
language plpgsql stable security definer set search_path = public as $$
declare
  v numeric := 0;
  a numeric := 0;
  b numeric := 0;
  ts_start timestamptz := (p_start::timestamp at time zone 'America/Sao_Paulo');
  ts_end   timestamptz := ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo');
begin
  if p_user is distinct from auth.uid() and not public.can_manage_goals() then
    raise exception 'Sem permissão para ver metas de outra pessoa';
  end if;

  case p_metric
    -- ── Telemarketing ──
    when 'tm_ligacoes' then
      select count(*) into v from telemarketing_calls
       where operator_id = p_user and created_at >= ts_start and created_at < ts_end;

    when 'tm_contatos_sucesso' then
      select count(*) into v from telemarketing_calls
       where operator_id = p_user and status = 'sucesso' and created_at >= ts_start and created_at < ts_end;

    when 'tm_doacoes_qtd' then
      select count(*) into v from donations
       where captured_by = p_user and coalesce(status::text, '') <> 'cancelado'
         and donation_date >= ts_start and donation_date < ts_end;

    when 'tm_valor_prometido' then
      select coalesce(sum(amount), 0) into v from donations
       where captured_by = p_user and coalesce(status::text, '') <> 'cancelado'
         and donation_date >= ts_start and donation_date < ts_end;

    when 'tm_valor_recebido' then
      select coalesce(sum(amount), 0) into v from donations
       where captured_by = p_user and status = 'pago'
         and coalesce(confirmed_at, donation_date) >= ts_start
         and coalesce(confirmed_at, donation_date) < ts_end;

    when 'tm_novos_doadores' then
      -- Primeira doação paga da vida do doador, captada por este operador no período.
      select count(distinct d.donor_id) into v from donations d
       where d.captured_by = p_user and d.status = 'pago'
         and d.donation_date >= ts_start and d.donation_date < ts_end
         and not exists (
           select 1 from donations p
            where p.donor_id = d.donor_id and p.status = 'pago' and p.donation_date < d.donation_date
         );

    when 'tm_doadores_reativados' then
      -- Doador que já tinha doado antes, mas estava há 90+ dias sem doar.
      select count(distinct d.donor_id) into v from donations d
       where d.captured_by = p_user and d.status = 'pago'
         and d.donation_date >= ts_start and d.donation_date < ts_end
         and exists (
           select 1 from donations p
            where p.donor_id = d.donor_id and p.status = 'pago'
              and p.donation_date < d.donation_date - interval '90 days'
         )
         and not exists (
           select 1 from donations p
            where p.donor_id = d.donor_id and p.status = 'pago' and p.id <> d.id
              and p.donation_date >= d.donation_date - interval '90 days'
              and p.donation_date < d.donation_date
         );

    when 'tm_taxa_conversao' then
      select count(*) into a from donations
       where captured_by = p_user and coalesce(status::text, '') <> 'cancelado'
         and donation_date >= ts_start and donation_date < ts_end;
      select count(*) into b from telemarketing_calls
       where operator_id = p_user and created_at >= ts_start and created_at < ts_end;
      v := case when b > 0 then round(a * 100.0 / b, 1) else 0 end;

    -- ── Mensageiro ──
    when 'msg_visitas' then
      select count(*) into v from route_items i join routes r on r.id = i.route_id
       where r.courier_id = p_user and r.collection_date between p_start and p_end
         and i.visit_status in ('coletado', 'sem_sucesso');

    when 'msg_coletas' then
      select count(*) into v from route_items i join routes r on r.id = i.route_id
       where r.courier_id = p_user and r.collection_date between p_start and p_end
         and i.visit_status = 'coletado';

    when 'msg_valor_coletado' then
      select coalesce(sum(coalesce(nullif(i.snapshot->>'amount', '')::numeric, 0)), 0) into v
        from route_items i join routes r on r.id = i.route_id
       where r.courier_id = p_user and r.collection_date between p_start and p_end
         and i.visit_status = 'coletado';

    when 'msg_taxa_sucesso' then
      select count(*) filter (where i.visit_status = 'coletado'),
             count(*) filter (where i.visit_status in ('coletado', 'sem_sucesso'))
        into a, b
        from route_items i join routes r on r.id = i.route_id
       where r.courier_id = p_user and r.collection_date between p_start and p_end;
      v := case when b > 0 then round(a * 100.0 / b, 1) else 0 end;

    else
      raise exception 'Indicador de meta desconhecido: %', p_metric;
  end case;

  return coalesce(v, 0);
end;
$$;

-- ── Metas + realizado no dia de referência ──────────────────
create or replace function public.goals_progress(p_date date default null)
returns table (
  goal_id uuid, user_id uuid, user_name text, user_role text,
  metric text, period text, target numeric, achieved numeric,
  period_start date, period_end date, valid_from date, valid_until date, notes text
)
language sql stable security definer set search_path = public as $$
  with ref as (select coalesce(p_date, (now() at time zone 'America/Sao_Paulo')::date) as day)
  select g.id, g.user_id, p.name::text, p.role::text,
         g.metric, g.period, g.target,
         public.goal_metric_value(g.user_id, g.metric, x.ps, x.pe),
         x.ps, x.pe, g.valid_from, g.valid_until, g.notes
    from goals g
    join profiles p on p.id = g.user_id
   cross join ref
   cross join lateral (
     select case when g.period = 'diaria' then ref.day else date_trunc('month', ref.day)::date end as ps,
            case when g.period = 'diaria' then ref.day
                 else (date_trunc('month', ref.day) + interval '1 month' - interval '1 day')::date end as pe
   ) x
   where g.active
     and g.valid_from <= x.pe
     and (g.valid_until is null or g.valid_until >= x.ps)
     and (public.can_manage_goals() or g.user_id = auth.uid())
   order by p.name, g.period, g.metric
$$;

revoke all on function public.can_manage_goals() from public, anon;
revoke all on function public.goal_metric_value(uuid, text, date, date) from public, anon;
revoke all on function public.goals_progress(date) from public, anon;
grant execute on function public.can_manage_goals() to authenticated;
grant execute on function public.goal_metric_value(uuid, text, date, date) to authenticated;
grant execute on function public.goals_progress(date) to authenticated;

-- ── Modelos iniciais (sugestões; o coordenador ajusta) ──────
insert into public.goal_templates (code, name, description, role, period, metric, target) values
  ('tm_dia_ligacoes',    'Ligações do dia',               'Volume mínimo de ligações registradas no Telemarketing.',                          'operador', 'diaria', 'tm_ligacoes',            60),
  ('tm_dia_contatos',    'Contatos efetivos do dia',      'Ligações em que o doador atendeu ou prometeu doar.',                               'operador', 'diaria', 'tm_contatos_sucesso',    20),
  ('tm_dia_doacoes',     'Doações captadas no dia',       'Doações lançadas pelo operador (pagas ou prometidas).',                            'operador', 'diaria', 'tm_doacoes_qtd',          5),
  ('tm_dia_prometido',   'Valor captado no dia',          'Soma das doações captadas no dia (pagas + prometidas).',                           'operador', 'diaria', 'tm_valor_prometido',    300),
  ('tm_mes_recebido',    'Valor recebido no mês',         'Soma das doações captadas pelo operador que já foram pagas.',                      'operador', 'mensal', 'tm_valor_recebido',    6000),
  ('tm_mes_doacoes',     'Doações captadas no mês',       'Quantidade de doações lançadas no mês.',                                           'operador', 'mensal', 'tm_doacoes_qtd',        100),
  ('tm_mes_reativados',  'Doadores reativados no mês',    'Doadores que estavam 90+ dias sem doar e voltaram a doar.',                        'operador', 'mensal', 'tm_doadores_reativados', 10),
  ('tm_mes_novos',       'Novos doadores no mês',         'Pessoas que fizeram a primeira doação paga pelo operador.',                        'operador', 'mensal', 'tm_novos_doadores',      15),
  ('tm_mes_conversao',   'Taxa de conversão do mês',      'Percentual de ligações que viraram doação.',                                       'operador', 'mensal', 'tm_taxa_conversao',      10),
  ('msg_dia_visitas',    'Visitas realizadas no dia',     'Visitas concluídas (coletadas ou sem sucesso) nas rotas do dia.',                  'motoboy',  'diaria', 'msg_visitas',            15),
  ('msg_dia_coletas',    'Coletas do dia',                'Visitas com coleta realizada.',                                                    'motoboy',  'diaria', 'msg_coletas',            12),
  ('msg_mes_valor',      'Valor coletado no mês',         'Soma dos valores em dinheiro coletados nas rotas.',                                'motoboy',  'mensal', 'msg_valor_coletado',   4000),
  ('msg_mes_coletas',    'Coletas do mês',                'Total de visitas com coleta realizada no mês.',                                    'motoboy',  'mensal', 'msg_coletas',           250),
  ('msg_mes_sucesso',    'Taxa de sucesso das visitas',   'Percentual de visitas concluídas que resultaram em coleta.',                      'motoboy',  'mensal', 'msg_taxa_sucesso',       85)
on conflict (code) do nothing;

commit;
