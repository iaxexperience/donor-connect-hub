-- ============================================================
-- Status operacional da visita (separado do status financeiro do
-- recibo), prioridade e horário previsto em route_items. RPC
-- update_visit_status para o mensageiro (ou coordenador/admin)
-- avançar o status da visita, com trilha de auditoria própria.
-- ============================================================
begin;

alter table route_items add column if not exists priority text not null default 'normal' check (priority in ('baixa','normal','alta','urgente'));
alter table route_items add column if not exists scheduled_time text;
alter table route_items add column if not exists visit_status text not null default 'aguardando'
  check (visit_status in ('aguardando','em_deslocamento','em_atendimento','coletado','sem_sucesso','reagendada','cancelada'));

create table if not exists public.route_item_events (
  id bigint generated always as identity primary key,
  route_item_id uuid not null references public.route_items(id),
  actor_id uuid not null,
  status text not null,
  reason text,
  created_at timestamptz not null default now()
);
alter table route_item_events enable row level security;
drop policy if exists route_item_events_read on route_item_events;
create policy route_item_events_read on route_item_events for select to authenticated
  using (exists (select 1 from route_items i where i.id = route_item_id and can_read_collection(i.route_id)));
revoke all on route_item_events from anon, authenticated;
grant select on route_item_events to authenticated;

drop function if exists public.update_visit_status(uuid, text, text);
create function public.update_visit_status(p_item uuid, p_status text, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare item route_items; is_owner boolean;
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
end;
$$;
revoke all on function update_visit_status(uuid,text,text) from public;
grant execute on function update_visit_status(uuid,text,text) to authenticated;

-- dispatch_collection passa a aceitar "priority" e "scheduled_time"
-- opcionais em cada item de p_items (ex.: {"source_kind":"physical","source_id":"...","priority":"alta","scheduled_time":"14:00–16:00"}).
create or replace function public.dispatch_collection(p_request uuid,p_courier uuid,p_date date,p_shift text,p_items jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare rid uuid; entry jsonb; snap jsonb; item_id uuid; rec_id uuid; org jsonb; courier_data jsonb; idx integer:=0; v_priority text; v_scheduled_time text;
begin
 if not can_manage_collection() then raise exception 'Acesso restrito a administradores e coordenadores'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select id into rid from routes where request_id=p_request;
 if rid is not null then return rid; end if;
 if p_date is null or p_date < (now() at time zone 'America/Sao_Paulo')::date or p_shift not in ('manha','tarde','noite') or p_shift is null then raise exception 'Data/turno inválidos'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Selecione entre 1 e 100 doações'; end if;
 select jsonb_build_object('name',name,'document',cpf) into courier_data from profiles where id=p_courier and role='motoboy' and status='Ativo' and nullif(cpf,'') is not null for share;
 if courier_data is null then raise exception 'Motoboy ativo com documento obrigatório'; end if;
 select jsonb_build_object('name',coalesce(nullif(s.legal_name,''),w.system_name),'cnpj',w.cnpj,'address',w.address,'logo_url',w.logo_url,'phone',w.phone,'email',w.email,'thank_you',s.thank_you,'bank_details',s.bank_details,'pix_key',s.pix_key,'legal_notice',s.legal_notice) into org from white_label_settings w cross join collection_settings s where w.id=1 and s.id=1;
 if org is null or coalesce(org->>'cnpj','')='' then raise exception 'Configure os dados institucionais e CNPJ'; end if;
 for entry in select value from jsonb_array_elements(p_items) order by value->>'source_kind',value->>'source_id' loop
 if entry->>'source_kind'='physical' then perform 1 from doacoes_fisicas where id=(entry->>'source_id')::uuid for update;
 elsif entry->>'source_kind'='cash' then perform 1 from caixa_transacoes where id=(entry->>'source_id')::uuid for update;
 elsif entry->>'source_kind'='pledge' then perform 1 from donations where id=(entry->>'source_id')::uuid for update;
 else raise exception 'Tipo de doação inválido'; end if;
 end loop;
 insert into routes(request_id,courier_id,created_by,collection_date,shift) values(p_request,p_courier,auth.uid(),p_date,p_shift) returning id into rid;
 for entry in select value from jsonb_array_elements(p_items) loop
 select c.snapshot into snap from collection_candidates() c where c.source_kind=entry->>'source_kind' and c.source_id=(entry->>'source_id')::uuid;
 if snap is null or coalesce(snap->>'address','')='' or coalesce(snap->>'document','')='' then raise exception 'Doação indisponível ou cadastro sem endereço/documento'; end if;
 idx:=idx+1;
 v_priority := coalesce(nullif(entry->>'priority',''), 'normal');
 if v_priority not in ('baixa','normal','alta','urgente') then v_priority := 'normal'; end if;
 v_scheduled_time := nullif(entry->>'scheduled_time','');
 insert into route_items(route_id,source_kind,source_id,position,snapshot,priority,scheduled_time) values(rid,entry->>'source_kind',(entry->>'source_id')::uuid,idx,snap,v_priority,v_scheduled_time) returning id into item_id;
 insert into receipts(route_item_id,organization,courier) values(item_id,org,courier_data) returning id into rec_id;
 insert into receipt_events(receipt_id,actor_id,event) values(rec_id,auth.uid(),'issued');
 end loop;
 return rid;
end $$;

commit;
