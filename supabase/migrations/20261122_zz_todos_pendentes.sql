-- ============================================================
-- TODOS OS SQLs PENDENTES DE 22/11/2026, na ordem certa.
-- Pode rodar inteiro de uma vez no SQL Editor (todos são idempotentes:
-- rodar de novo não estraga nada).
--   1. Metas de coordenador
--   2. Quadro de medalhas (goals_board)
--   3. Painel da Coordenação (coordinator_dashboard)
--   4. Fila do Telemarketing por carteira
--   5. Área de importação por Excel
-- ============================================================


-- >>>>>>>>>>>>>>>>>>>> 20261122_goals_coordenador.sql <<<<<<<<<<<<<<<<<<<<
-- ============================================================
-- METAS para COORDENADORES + aba "Meta mensal".
--
-- A meta do coordenador é medida pelo resultado da equipe inteira
-- (todas as doações captadas por operadores, todas as ligações e
-- todas as coletas das rotas), não por lançamentos dele.
--
-- Rode DEPOIS de 20261122_goals.sql. Idempotente.
-- ============================================================
begin;

-- Modelos de meta também para a função "coordenador".
alter table public.goal_templates drop constraint if exists goal_templates_role_check;
alter table public.goal_templates
  add constraint goal_templates_role_check check (role in ('operador', 'motoboy', 'coordenador'));

-- Cálculo do realizado com os indicadores da coordenação.
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
       where captured_by = p_user and coalesce(status, '') <> 'cancelado'
         and donation_date >= ts_start and donation_date < ts_end;

    when 'tm_valor_prometido' then
      select coalesce(sum(amount), 0) into v from donations
       where captured_by = p_user and coalesce(status, '') <> 'cancelado'
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
       where captured_by = p_user and coalesce(status, '') <> 'cancelado'
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

    -- ── Coordenador: resultado da equipe inteira ──
    when 'coord_valor_recebido' then
      select coalesce(sum(amount), 0) into v from donations
       where captured_by is not null and status = 'pago'
         and coalesce(confirmed_at, donation_date) >= ts_start
         and coalesce(confirmed_at, donation_date) < ts_end;

    when 'coord_doacoes_qtd' then
      select count(*) into v from donations
       where captured_by is not null and coalesce(status, '') <> 'cancelado'
         and donation_date >= ts_start and donation_date < ts_end;

    when 'coord_ligacoes' then
      select count(*) into v from telemarketing_calls
       where created_at >= ts_start and created_at < ts_end;

    when 'coord_valor_coletado' then
      select coalesce(sum(coalesce(nullif(i.snapshot->>'amount', '')::numeric, 0)), 0) into v
        from route_items i join routes r on r.id = i.route_id
       where r.collection_date between p_start and p_end
         and i.visit_status = 'coletado';

    when 'coord_coletas' then
      select count(*) into v from route_items i join routes r on r.id = i.route_id
       where r.collection_date between p_start and p_end
         and i.visit_status = 'coletado';

    else
      raise exception 'Indicador de meta desconhecido: %', p_metric;
  end case;

  return coalesce(v, 0);
end;
$$;

revoke all on function public.goal_metric_value(uuid, text, date, date) from public, anon;
grant execute on function public.goal_metric_value(uuid, text, date, date) to authenticated;

insert into public.goal_templates (code, name, description, role, period, metric, target) values
  ('coord_mes_recebido', 'Valor recebido pela equipe no mês', 'Soma das doações captadas pela equipe de telemarketing já pagas.', 'coordenador', 'mensal', 'coord_valor_recebido', 50000),
  ('coord_mes_doacoes',  'Doações captadas pela equipe',      'Quantidade de doações lançadas pela equipe no mês.',              'coordenador', 'mensal', 'coord_doacoes_qtd',     800),
  ('coord_mes_ligacoes', 'Ligações da equipe no mês',         'Total de ligações registradas pela equipe.',                      'coordenador', 'mensal', 'coord_ligacoes',       6000),
  ('coord_mes_coletado', 'Valor coletado pelos mensageiros',  'Soma dos valores coletados nas rotas no mês.',                    'coordenador', 'mensal', 'coord_valor_coletado', 20000)
on conflict (code) do nothing;

commit;


-- >>>>>>>>>>>>>>>>>>>> 20261122_goals_board.sql <<<<<<<<<<<<<<<<<<<<
-- ============================================================
-- QUADRO DE MEDALHAS das metas — goals_board(dia)
--
-- Para cada pessoa e indicador com meta ativa no mês:
--   meta do mês, meta do dia, realizado no mês e hoje, e as 4 semanas
--   do mês (01–07, 08–14, 15–21, 22–fim) com meta e realizado.
--   * Só tem meta diária → meta do mês = diária × dias do mês.
--   * Só tem meta mensal → meta do dia/semana proporcional aos dias.
--   * Indicadores de taxa (%) não são divididos: a meta vale igual.
-- Medalhas (calculadas na tela): bronze 33,33% · prata 66,66% · ouro 100%.
--
-- Coordenador/admin veem todos. Operador e mensageiro veem as pessoas
-- da mesma função (para a "corrida do mês").
-- Rode DEPOIS de 20261122_goals_coordenador.sql. Idempotente.
-- ============================================================
begin;

-- Mesmo cálculo de goal_metric_value, sem a checagem de permissão.
-- Uso interno (não liberado para os usuários chamarem direto).
create or replace function public.goal_metric_value_internal(p_user uuid, p_metric text, p_start date, p_end date)
returns numeric
language plpgsql stable security definer set search_path = public as $$
declare
  v numeric := 0;
  a numeric := 0;
  b numeric := 0;
  ts_start timestamptz := (p_start::timestamp at time zone 'America/Sao_Paulo');
  ts_end   timestamptz := ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo');
begin

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
       where captured_by = p_user and coalesce(status, '') <> 'cancelado'
         and donation_date >= ts_start and donation_date < ts_end;

    when 'tm_valor_prometido' then
      select coalesce(sum(amount), 0) into v from donations
       where captured_by = p_user and coalesce(status, '') <> 'cancelado'
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
       where captured_by = p_user and coalesce(status, '') <> 'cancelado'
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

    -- ── Coordenador: resultado da equipe inteira ──
    when 'coord_valor_recebido' then
      select coalesce(sum(amount), 0) into v from donations
       where captured_by is not null and status = 'pago'
         and coalesce(confirmed_at, donation_date) >= ts_start
         and coalesce(confirmed_at, donation_date) < ts_end;

    when 'coord_doacoes_qtd' then
      select count(*) into v from donations
       where captured_by is not null and coalesce(status, '') <> 'cancelado'
         and donation_date >= ts_start and donation_date < ts_end;

    when 'coord_ligacoes' then
      select count(*) into v from telemarketing_calls
       where created_at >= ts_start and created_at < ts_end;

    when 'coord_valor_coletado' then
      select coalesce(sum(coalesce(nullif(i.snapshot->>'amount', '')::numeric, 0)), 0) into v
        from route_items i join routes r on r.id = i.route_id
       where r.collection_date between p_start and p_end
         and i.visit_status = 'coletado';

    when 'coord_coletas' then
      select count(*) into v from route_items i join routes r on r.id = i.route_id
       where r.collection_date between p_start and p_end
         and i.visit_status = 'coletado';

    else
      raise exception 'Indicador de meta desconhecido: %', p_metric;
  end case;

  return coalesce(v, 0);
end;
$$;

revoke all on function public.goal_metric_value_internal(uuid, text, date, date) from public, anon, authenticated;

create or replace function public.goals_board(p_date date default null)
returns table (
  user_id uuid, user_name text, user_role text, metric text,
  monthly_target numeric, daily_target numeric,
  month_achieved numeric, today_achieved numeric, weeks jsonb
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_day date := coalesce(p_date, (now() at time zone 'America/Sao_Paulo')::date);
  v_ms date := date_trunc('month', v_day)::date;
  v_me date := (date_trunc('month', v_day) + interval '1 month - 1 day')::date;
  v_days int := extract(day from (date_trunc('month', v_day) + interval '1 month - 1 day'))::int;
  v_manager boolean := public.can_manage_goals();
  v_my_role text;
begin
  select role into v_my_role from profiles where id = auth.uid() and status = 'Ativo';
  if v_my_role is null then raise exception 'Usuário sem acesso'; end if;

  return query
  with metas as (
    select g.user_id, g.metric,
           max(g.target) filter (where g.period = 'mensal') as t_mes,
           max(g.target) filter (where g.period = 'diaria') as t_dia
      from goals g
     where g.active
       and g.valid_from <= v_me
       and (g.valid_until is null or g.valid_until >= v_ms)
     group by g.user_id, g.metric
  ),
  base as (
    select m.user_id, p.name::text as nome, p.role::text as funcao, m.metric,
           (m.metric like '%taxa%') as is_rate,
           case when m.metric like '%taxa%' then coalesce(m.t_mes, m.t_dia)
                else coalesce(m.t_mes, m.t_dia * v_days) end as alvo_mes,
           case when m.metric like '%taxa%' then coalesce(m.t_dia, m.t_mes)
                else coalesce(m.t_dia, round(m.t_mes / v_days, 2)) end as alvo_dia
      from metas m
      join profiles p on p.id = m.user_id
     where p.status = 'Ativo'
       and (v_manager or m.user_id = auth.uid() or p.role = v_my_role)
  )
  select b.user_id, b.nome, b.funcao, b.metric, b.alvo_mes, b.alvo_dia,
         public.goal_metric_value_internal(b.user_id, b.metric, v_ms, least(v_day, v_me)),
         public.goal_metric_value_internal(b.user_id, b.metric, v_day, v_day),
         (select jsonb_agg(jsonb_build_object(
                    'n', w.n, 'inicio', w.ws, 'fim', w.we,
                    'meta', case when b.is_rate then b.alvo_mes
                                 else round(b.alvo_mes * ((w.we - w.ws) + 1) / v_days, 2) end,
                    'realizado', case when w.ws <= v_day
                                      then public.goal_metric_value_internal(b.user_id, b.metric, w.ws, least(w.we, v_day))
                                      else 0 end,
                    'atual', v_day between w.ws and w.we,
                    'futura', w.ws > v_day
                  ) order by w.n)
            from (select n, v_ms + (n - 1) * 7 as ws,
                         case when n = 4 then v_me else v_ms + n * 7 - 1 end as we
                    from generate_series(1, 4) n) w)
    from base b
   order by b.nome, b.metric;
end;
$$;

revoke all on function public.goals_board(date) from public, anon;
grant execute on function public.goals_board(date) to authenticated;

commit;


-- >>>>>>>>>>>>>>>>>>>> 20261122_coordinator_dashboard.sql <<<<<<<<<<<<<<<<<<<<
-- ============================================================
-- PAINEL DA COORDENAÇÃO — coordinator_dashboard(dia)
--
-- Devolve num JSON tudo o que a tela /dashboard/coordenacao mostra.
-- Só coordenador e admin ativos podem chamar.
--
-- "Recebido" = doações pagas (pela data de confirmação) + lançamentos
-- confirmados do Caixa — o mesmo critério do relatório de Doações
-- Recebidas.
-- Rode DEPOIS de 20261122_goals.sql. Idempotente.
-- ============================================================
begin;

create or replace function public.coordinator_dashboard(p_date date default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_day date := coalesce(p_date, (now() at time zone 'America/Sao_Paulo')::date);
  v_month date := date_trunc('month', v_day)::date;
  v_prev_month date := (date_trunc('month', v_day) - interval '1 month')::date;
  v_prev_same_day date;                                 -- mesmo dia no mês anterior
  v_days_in_month int := extract(day from (date_trunc('month', v_day) + interval '1 month - 1 day'))::int;
  tz text := 'America/Sao_Paulo';
  result jsonb;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coordenador') and status = 'Ativo') then
    raise exception 'Painel disponível só para coordenadores';
  end if;

  v_prev_same_day := least(v_prev_month + (extract(day from v_day)::int - 1),
                           (v_month - 1));

  with
  -- Tudo que entrou de dinheiro, com o dia (horário de Brasília).
  recebido as (
    select (coalesce(d.confirmed_at, d.donation_date) at time zone tz)::date as dia,
           d.amount, d.campaign_id, d.captured_by, coalesce(nullif(d.billing_type, ''), d.payment_method, 'Outro') as forma,
           'doacao'::text as origem
      from donations d
     where d.status = 'pago'
       and coalesce(d.confirmed_at, d.donation_date) >= (v_prev_month::timestamp at time zone tz)
    union all
    select (c.created_at at time zone tz)::date, c.amount, null::uuid, c.created_by, c.payment_method, 'caixa'
      from caixa_transacoes c
     where c.status = 'confirmado'
       and c.created_at >= (v_prev_month::timestamp at time zone tz)
  ),
  metas as (
    select * from public.goals_progress(v_day)
  )
  select jsonb_build_object(
    'dia', v_day,
    'mes', v_month,

    -- ── Hoje ──
    'hoje', jsonb_build_object(
      'recebido', coalesce((select sum(amount) from recebido where dia = v_day), 0),
      'recebido_qtd', (select count(*) from recebido where dia = v_day),
      'captado', coalesce((select sum(amount) from donations
                            where coalesce(status, '') <> 'cancelado'
                              and (donation_date at time zone tz)::date = v_day), 0),
      'ligacoes', (select count(*) from telemarketing_calls where (created_at at time zone tz)::date = v_day),
      'contatos_sucesso', (select count(*) from telemarketing_calls
                            where status = 'sucesso' and (created_at at time zone tz)::date = v_day),
      'coletas', (select count(*) from route_items i join routes r on r.id = i.route_id
                   where r.collection_date = v_day and i.visit_status = 'coletado'),
      'visitas_previstas', (select count(*) from route_items i join routes r on r.id = i.route_id
                             where r.collection_date = v_day),
      'mesmo_dia_mes_anterior', coalesce((select sum(amount) from recebido where dia = v_prev_same_day), 0)
    ),

    -- ── Metas (definidas na tela Metas) ──
    'metas', jsonb_build_object(
      -- Meta em R$ do dia: soma das metas diárias de valor da equipe.
      'dia_valor_meta', coalesce((select sum(target) from metas
                                   where period = 'diaria' and metric in ('tm_valor_prometido', 'tm_valor_recebido', 'msg_valor_coletado')), 0),
      'dia_valor_alcancado', coalesce((select sum(achieved) from metas
                                        where period = 'diaria' and metric in ('tm_valor_prometido', 'tm_valor_recebido', 'msg_valor_coletado')), 0),
      -- Meta do mês: a da coordenação (resultado da equipe); se não houver,
      -- a soma das metas mensais de valor de cada operador e mensageiro.
      'mes_valor_meta', coalesce(
          (select max(target) from metas where period = 'mensal' and metric = 'coord_valor_recebido'),
          (select sum(target) from metas where period = 'mensal' and metric in ('tm_valor_recebido', 'msg_valor_coletado')),
          0),
      'dias_no_mes', v_days_in_month,
      'pessoas', (
        select coalesce(jsonb_agg(x order by x->>'nome'), '[]'::jsonb) from (
          select jsonb_build_object(
                   'nome', user_name, 'funcao', user_role, 'periodo', period, 'indicador', metric,
                   'meta', target, 'alcancado', achieved) as x
            from metas
        ) s
      )
    ),

    -- ── Mês atual × mês anterior ──
    'mes_atual', jsonb_build_object(
      'recebido', coalesce((select sum(amount) from recebido where dia between v_month and v_day), 0),
      'doacoes', (select count(*) from recebido where dia between v_month and v_day),
      'pendente', coalesce((select sum(amount) from donations
                             where status = 'pendente' and donation_date >= (v_month::timestamp at time zone tz)), 0),
      'novos_doadores', (select count(distinct d.donor_id) from donations d
                          where d.status = 'pago'
                            and (coalesce(d.confirmed_at, d.donation_date) at time zone tz)::date between v_month and v_day
                            and not exists (select 1 from donations p where p.donor_id = d.donor_id and p.status = 'pago'
                                             and coalesce(p.confirmed_at, p.donation_date) < (v_month::timestamp at time zone tz))),
      'ligacoes', (select count(*) from telemarketing_calls
                    where (created_at at time zone tz)::date between v_month and v_day)
    ),
    'mes_anterior', jsonb_build_object(
      'ate_mesmo_dia', coalesce((select sum(amount) from recebido where dia between v_prev_month and v_prev_same_day), 0),
      'total', coalesce((select sum(amount) from recebido where dia between v_prev_month and v_month - 1), 0),
      'doacoes_ate_mesmo_dia', (select count(*) from recebido where dia between v_prev_month and v_prev_same_day)
    ),

    -- Recebido por dia (para o gráfico acumulado).
    'serie', (
      select coalesce(jsonb_agg(jsonb_build_object('dia', n, 'atual', atual, 'anterior', anterior) order by n), '[]'::jsonb)
        from (
          select n,
                 coalesce((select sum(amount) from recebido where dia = v_month + (n - 1) and v_month + (n - 1) <= v_day), 0) as atual,
                 coalesce((select sum(amount) from recebido where dia = v_prev_month + (n - 1) and v_prev_month + (n - 1) < v_month), 0) as anterior
            from generate_series(1, v_days_in_month) n
        ) s
    ),

    -- ── Campanhas ativas ──
    'campanhas', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', c.id, 'nome', c.name, 'meta', c.goal_amount,
               'arrecadado', coalesce((select sum(d.amount) from donations d where d.campaign_id = c.id and d.status = 'pago'), 0),
               'doacoes', (select count(*) from donations d where d.campaign_id = c.id and d.status = 'pago'),
               'mes', coalesce((select sum(d.amount) from donations d where d.campaign_id = c.id and d.status = 'pago'
                                 and coalesce(d.confirmed_at, d.donation_date) >= (v_month::timestamp at time zone tz)), 0),
               'inicio', c.start_date, 'fim', c.end_date
             ) order by c.name), '[]'::jsonb)
        from campaigns c
       where coalesce(c.is_active, true)
    ),

    -- ── Ranking do telemarketing no mês ──
    'ranking', (
      select coalesce(jsonb_agg(r order by (r->>'recebido')::numeric desc), '[]'::jsonb) from (
        select jsonb_build_object(
                 'nome', p.name, 'funcao', p.role,
                 'recebido', coalesce((select sum(amount) from recebido x where x.captured_by = p.id and x.origem = 'doacao'
                                         and x.dia between v_month and v_day), 0),
                 'doacoes', (select count(*) from donations d where d.captured_by = p.id and coalesce(d.status, '') <> 'cancelado'
                              and (d.donation_date at time zone tz)::date between v_month and v_day),
                 'ligacoes', (select count(*) from telemarketing_calls t where t.operator_id = p.id
                               and (t.created_at at time zone tz)::date between v_month and v_day),
                 'ligacoes_hoje', (select count(*) from telemarketing_calls t where t.operator_id = p.id
                                    and (t.created_at at time zone tz)::date = v_day),
                 'carteira', (select count(*) from donors dn where dn.assigned_operator_id = p.id)
               ) as r
          from profiles p
         where p.role = 'operador' and p.status = 'Ativo'
      ) s
    ),

    -- ── Mensageiros hoje ──
    'mensageiros', (
      select coalesce(jsonb_agg(m order by m->>'nome'), '[]'::jsonb) from (
        select jsonb_build_object(
                 'nome', p.name,
                 'previstas', count(i.id),
                 'coletas', count(i.id) filter (where i.visit_status = 'coletado'),
                 'sem_sucesso', count(i.id) filter (where i.visit_status = 'sem_sucesso'),
                 'valor', coalesce(sum(coalesce(nullif(i.snapshot->>'amount', '')::numeric, 0))
                                   filter (where i.visit_status = 'coletado'), 0)
               ) as m
          from profiles p
          join routes r on r.courier_id = p.id and r.collection_date = v_day
          left join route_items i on i.route_id = r.id
         where p.role = 'motoboy'
         group by p.id, p.name
      ) s
    ),

    -- ── Formas de pagamento no mês ──
    'formas', (
      select coalesce(jsonb_agg(jsonb_build_object('forma', forma, 'valor', valor, 'qtd', qtd) order by valor desc), '[]'::jsonb)
        from (select lower(forma) as forma, sum(amount) as valor, count(*) as qtd
                from recebido where dia between v_month and v_day group by 1) s
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.coordinator_dashboard(date) from public, anon;
grant execute on function public.coordinator_dashboard(date) to authenticated;

commit;


-- >>>>>>>>>>>>>>>>>>>> 20261122_telemarketing_queue.sql <<<<<<<<<<<<<<<<<<<<
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
             else d.last_donation_date::date + public.donor_contact_interval(d.type)
           end as volta_em,
           (select max(c.created_at) from telemarketing_calls c where c.donor_id = d.id) as ultima_ligacao
      from donors d
     where coalesce(d.type, 'lead') <> 'desativado'
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


-- >>>>>>>>>>>>>>>>>>>> 20261122_import_staging.sql <<<<<<<<<<<<<<<<<<<<
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

-- Atualiza o cache da API para as funções novas aparecerem na hora.
notify pgrst, 'reload schema';
