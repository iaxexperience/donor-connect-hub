-- ============================================================
-- Quando um operador de telemarketing é desativado (profiles.status
-- deixa de ser 'Ativo'), a carteira dele (donors.assigned_operator_id)
-- é redistribuída automaticamente, em rodízio, entre os demais
-- operadores que continuam ativos. Implementado como trigger pra
-- funcionar não importa por onde a desativação aconteça.
-- ============================================================
begin;

create or replace function public.tr_redistribute_on_operator_deactivation() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_op_ids uuid[];
  v_op_count integer;
  v_idx integer := 0;
  v_donor record;
  v_total integer := 0;
begin
  if new.role = 'operador' and old.status = 'Ativo' and new.status is distinct from 'Ativo' then
    select array_agg(id order by name) into v_op_ids
    from profiles where role = 'operador' and status = 'Ativo' and id <> new.id;

    if v_op_ids is not null and array_length(v_op_ids, 1) > 0 then
      v_op_count := array_length(v_op_ids, 1);

      for v_donor in select id from donors where assigned_operator_id = new.id order by id
      loop
        update donors set assigned_operator_id = v_op_ids[(v_idx % v_op_count) + 1] where id = v_donor.id;
        v_idx := v_idx + 1;
      end loop;
      v_total := v_idx;

      if v_total > 0 then
        insert into audit_logs(user_id, action, resource, details)
        values (new.id, 'AUTO_REDISTRIBUTE_ON_DEACTIVATION', 'donors', jsonb_build_object('from_operator', new.id, 'total_redistributed', v_total));
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_redistribute_on_operator_deactivation on public.profiles;
create trigger trg_redistribute_on_operator_deactivation
  after update on public.profiles
  for each row execute function public.tr_redistribute_on_operator_deactivation();

commit;
