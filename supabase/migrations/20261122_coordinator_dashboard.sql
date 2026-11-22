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
