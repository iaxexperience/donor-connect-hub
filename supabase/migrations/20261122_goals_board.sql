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
