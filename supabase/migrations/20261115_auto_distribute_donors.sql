-- ============================================================
-- Distribuição automática de doadores para a carteira dos
-- operadores de telemarketing ("roleta"). Restrito a
-- admin/coordenador. Pega doadores "prontos para contato" (mesma
-- regra por tipo usada pela automação de follow-up, em
-- follow_up_settings.rules) que ainda não têm carteira
-- (assigned_operator_id is null) e reparte em rodízio entre os
-- operadores de telemarketing ativos, até p_count_per_operator
-- doadores para cada um.
-- ============================================================
begin;

create or replace function public.auto_distribute_donors(p_count_per_operator integer default 10)
returns table(operator_id uuid, operator_name text, assigned_count integer)
language plpgsql security definer set search_path = public as $$
declare
  v_rules jsonb;
  v_op_ids uuid[];
  v_op_count integer;
  v_idx integer := 0;
  v_donor record;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('admin','coordenador') and status = 'Ativo') then
    raise exception 'Apenas administradores e coordenadores podem distribuir doadores';
  end if;

  if p_count_per_operator is null or p_count_per_operator <= 0 then
    raise exception 'Informe uma quantidade por operador maior que zero';
  end if;

  select rules into v_rules from follow_up_settings where id = 1;

  select array_agg(id order by name) into v_op_ids
  from profiles where role = 'operador' and status = 'Ativo';

  if v_op_ids is null or array_length(v_op_ids, 1) = 0 then
    raise exception 'Nenhum operador de telemarketing ativo encontrado';
  end if;
  v_op_count := array_length(v_op_ids, 1);

  create temporary table tmp_distrib (operator_id uuid primary key, cnt integer default 0) on commit drop;
  insert into tmp_distrib(operator_id) select unnest(v_op_ids);

  for v_donor in
    select d.id
    from donors d
    where d.assigned_operator_id is null
      and (
        d.type = 'lead'
        or d.last_donation_date is null
        or (now()::date - d.last_donation_date::date) >= coalesce(
          (select (r->>'followUpDays')::int from jsonb_array_elements(coalesce(v_rules, '[]'::jsonb)) r where r->>'type' = d.type::text limit 1),
          30
        )
      )
    order by coalesce(d.last_donation_date::date, '1970-01-01'::date) asc, d.id asc
    limit (v_op_count * p_count_per_operator)
  loop
    update donors set assigned_operator_id = v_op_ids[(v_idx % v_op_count) + 1] where id = v_donor.id;
    update tmp_distrib set cnt = cnt + 1 where operator_id = v_op_ids[(v_idx % v_op_count) + 1];
    v_idx := v_idx + 1;
  end loop;

  insert into audit_logs(user_id, action, resource, details)
  values (auth.uid(), 'AUTO_DISTRIBUTE_DONORS', 'donors', jsonb_build_object('total_distributed', v_idx, 'count_per_operator', p_count_per_operator));

  return query
    select t.operator_id, p.name, t.cnt
    from tmp_distrib t join profiles p on p.id = t.operator_id
    order by p.name;
end;
$$;

revoke all on function auto_distribute_donors(integer) from public;
grant execute on function auto_distribute_donors(integer) to authenticated;

commit;
