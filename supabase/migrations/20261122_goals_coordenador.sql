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
