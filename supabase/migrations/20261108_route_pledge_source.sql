-- ============================================================
-- Estende o módulo de coleta para incluir doações "prometidas"
-- pelo telemarketing (registradas em `donations`, ainda sem coleta
-- física) na mesma tela de atribuição do coordenador. Decisão
-- aprovada explicitamente na Fase 1 do plano (altera uma CHECK
-- constraint em produção já usada por Transferência/Recibos).
--
-- Convenção adotada: uma doação em `donations` é candidata a coleta
-- presencial quando status='pendente' e payment_method='Manual'
-- (ou seja, não é um link de pagamento online/Pix/boleto Asaas).
-- ============================================================
begin;

-- Troca a CHECK constraint de source_kind sem depender do nome
-- exato que o Postgres gerou automaticamente.
do $$
declare v_conname text;
begin
  select con.conname into v_conname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'route_items' and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%source_kind%';
  if v_conname is not null then
    execute format('alter table route_items drop constraint %I', v_conname);
  end if;
end $$;
alter table route_items add constraint route_items_source_kind_check check (source_kind in ('physical','cash','pledge'));

create or replace function public.collection_candidates() returns table(source_kind text,source_id uuid,snapshot jsonb)
language sql stable security definer set search_path=public as $$
 select s.kind,s.id,jsonb_build_object('donor_name',s.name,'document',d.document_id,'phone',d.phone,
 'address',concat_ws(', ',nullif(d.address->>'logradouro',''),nullif(d.address_number,''),nullif(d.complement,''),nullif(d.neighborhood,''),nullif(d.city,''),nullif(d.state,''),nullif(d.zip_code,'')),
 'neighborhood',d.neighborhood,'zip_code',d.zip_code,'description',s.description,'quantity',s.quantity,'amount',s.amount)
 from (
 select 'physical' kind,f.id,f.donor_id,f.donor_name name,coalesce(nullif(f.descricao,''),f.tipo_doacao) description,f.quantidade quantity,null::numeric amount from doacoes_fisicas f where f.status='pendente'
 union all
 select 'cash',c.id,c.donor_id,c.donor_name,'Doação em espécie',null,c.amount from caixa_transacoes c where c.status='pendente' and c.payment_method='dinheiro'
 union all
 select 'pledge',don.id,don.donor_id,dn.name,'Doação combinada por telemarketing',null,don.amount
   from donations don join donors dn on dn.id=don.donor_id
   where don.status='pendente' and don.payment_method in ('Manual','Dinheiro')
 ) s join donors d on d.id=s.donor_id
 where can_manage_collection() and not exists(select 1 from route_items i where i.source_kind=s.kind and i.source_id=s.id)
$$;

-- Ao confirmar um recibo cuja origem é uma doação "prometida",
-- baixa donations.status para 'pago' (em vez de doacoes_fisicas/caixa_transacoes).
create or replace function public.transition_collection_receipt(p_receipt uuid,p_status text,p_reason text default null) returns void
language plpgsql security definer set search_path=public as $$
declare rec receipts; item route_items;
begin
 select * into rec from receipts where id=p_receipt for update;
 if not found then raise exception 'Recibo inexistente'; end if;
 select * into item from route_items where id=rec.route_item_id;
 if not can_read_collection(item.route_id) then raise exception 'Sem permissão'; end if;
 if p_status not in ('confirmed','cancelled','disputed') or p_status is null then raise exception 'Status inválido'; end if;
 if p_status <> 'confirmed' and (not can_manage_collection() or length(trim(coalesce(p_reason,'')))<5) then raise exception 'Administrador/coordenador e justificativa obrigatórios'; end if;
 if rec.status<>'issued' and not (rec.status='confirmed' and p_status='disputed' and can_manage_collection()) then raise exception 'Baixa repetida ou transição inválida'; end if;
 if p_status='confirmed' then
 if item.source_kind='physical' then
 update doacoes_fisicas set status='recebido',recebido_em=now() where id=item.source_id and status='pendente';
 elsif item.source_kind='cash' then
 update caixa_transacoes set status='confirmado',compensated_at=now() where id=item.source_id and status='pendente' and payment_method='dinheiro';
 else
 update donations set status='pago',confirmed_at=now() where id=item.source_id and status='pendente';
 end if;
 if not found then raise exception 'Origem já baixada/cancelada. Solicite análise administrativa'; end if;
 end if;
 update receipts set status=p_status,confirmed_at=case when p_status='confirmed' then now() else confirmed_at end where id=p_receipt;
 insert into receipt_events(receipt_id,actor_id,event,reason) values(p_receipt,auth.uid(),p_status,p_reason);
end $$;

commit;
