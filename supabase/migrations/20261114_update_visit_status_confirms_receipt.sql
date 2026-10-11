-- ============================================================
-- Unifica a confirmação do recibo de coleta dentro de
-- update_visit_status, na MESMA chamada que marca a visita como
-- "coletado" — em vez de depender de uma segunda chamada separada
-- do frontend (transition_collection_receipt), que podia deixar o
-- sistema num estado inconsistente (visita "coletado" mas recibo
-- ainda "issued" e doação/caixa ainda "pendente") sempre que a
-- segunda chamada falhasse ou não fosse disparada por algum motivo.
--
-- Chamar update_visit_status com p_status='coletado' passa a:
-- 1) marcar a visita como coletada (como já fazia);
-- 2) confirmar o recibo correspondente e dar baixa na origem
--    (doacoes_fisicas/caixa_transacoes/donations), igual
--    transition_collection_receipt(p_status='confirmed') fazia.
-- Chamar de novo com p_status='coletado' numa visita já coletada é
-- seguro e serve como retry: se o recibo ainda estiver "issued",
-- tenta confirmar de novo; se já estiver "confirmed", não faz nada.
-- ============================================================
begin;

create or replace function public.update_visit_status(p_item uuid, p_status text, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare item route_items; is_owner boolean; rec receipts; v_courier uuid; v_updated boolean;
begin
  select * into item from route_items where id = p_item for update;
  if not found then raise exception 'Item de rota inexistente'; end if;
  if not can_read_collection(item.route_id) then raise exception 'Sem permissão'; end if;
  if p_status not in ('aguardando','em_deslocamento','em_atendimento','coletado','sem_sucesso','reagendada','cancelada') then
    raise exception 'Status de visita inválido';
  end if;
  select exists(select 1 from routes r where r.id = item.route_id and r.courier_id = auth.uid()) into is_owner;
  if not is_owner and not can_manage_collection() then
    raise exception 'Apenas o mensageiro responsável ou um coordenador/administrador podem atualizar esta visita';
  end if;
  update route_items set visit_status = p_status where id = p_item;
  insert into route_item_events(route_item_id, actor_id, status, reason) values (p_item, auth.uid(), p_status, p_reason);

  if p_status = 'coletado' then
    select * into rec from receipts where route_item_id = p_item for update;
    if found and rec.status = 'issued' then
      select courier_id into v_courier from routes where id = item.route_id;
      if item.source_kind = 'physical' then
        update doacoes_fisicas set status='recebido', recebido_em=now() where id=item.source_id and status='pendente';
        v_updated := found;
      elsif item.source_kind = 'cash' then
        update caixa_transacoes set status='confirmado', compensated_at=now(), created_by=v_courier where id=item.source_id and status='pendente' and payment_method='dinheiro';
        v_updated := found;
      else
        update donations set status='pago', confirmed_at=now() where id=item.source_id and status='pendente';
        v_updated := found;
      end if;
      if v_updated then
        update receipts set status='confirmed', confirmed_at=now() where id = rec.id;
        insert into receipt_events(receipt_id, actor_id, event, reason) values (rec.id, auth.uid(), 'confirmed', null);
      end if;
    end if;
  end if;
end;
$$;

commit;
