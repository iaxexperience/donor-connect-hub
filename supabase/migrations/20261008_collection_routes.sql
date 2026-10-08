-- Collection module: apply after the existing application migrations.
begin;
create table public.system_settings (
 id integer primary key default 1 check (id=1),
 legal_name text not null default '', thank_you text not null default 'Obrigado por transformar vidas!',
 bank_details text not null default '', pix_key text not null default '', legal_notice text not null default ''
);
insert into public.system_settings(id) values(1);
create table public.routes (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 courier_id uuid not null references public.profiles(id), created_by uuid not null references public.profiles(id),
 collection_date date not null, shift text not null check(shift in ('manha','tarde','noite')),
 dispatched_at timestamptz not null default now()
);
create table public.route_items (
 id uuid primary key default gen_random_uuid(), route_id uuid not null references public.routes(id),
 source_kind text not null check(source_kind in ('physical','cash')), source_id uuid not null,
 position integer not null check(position>0), snapshot jsonb not null,
 unique(source_kind,source_id), unique(route_id,position)
);
create sequence public.collection_receipt_number;
create table public.receipts (
 id uuid primary key default gen_random_uuid(), route_item_id uuid not null unique references public.route_items(id),
 number text not null unique default ('REC-' || to_char(now() at time zone 'America/Sao_Paulo','YYYY') || '-' || lpad(nextval('public.collection_receipt_number')::text,8,'0')),
 status text not null default 'issued' check(status in ('issued','confirmed','cancelled','disputed')),
 organization jsonb not null, courier jsonb not null, issued_at timestamptz not null default now(), confirmed_at timestamptz
);
create table public.receipt_events (
 id bigint generated always as identity primary key, receipt_id uuid not null references public.receipts(id),
 actor_id uuid not null, event text not null, reason text, created_at timestamptz not null default now()
);
create function public.collection_admin() returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin' and status='Ativo') $$;
create function public.can_read_collection(p_route uuid) returns boolean language sql stable security definer set search_path=public
as $$ select collection_admin() or exists(select 1 from routes r join profiles p on p.id=r.courier_id where r.id=p_route and p.id=auth.uid() and p.role='motoboy' and p.status='Ativo') $$;
alter table system_settings enable row level security;
alter table routes enable row level security;
alter table route_items enable row level security;
alter table receipts enable row level security;
alter table receipt_events enable row level security;
create policy settings_admin on system_settings for all to authenticated using(collection_admin()) with check(collection_admin());
create policy routes_read on routes for select to authenticated using(can_read_collection(id));
create policy items_read on route_items for select to authenticated using(can_read_collection(route_id));
create policy receipts_read on receipts for select to authenticated using(exists(select 1 from route_items i where i.id=route_item_id and can_read_collection(i.route_id)));
create policy events_read on receipt_events for select to authenticated using(collection_admin());
revoke all on routes,route_items,receipts,receipt_events from anon,authenticated;
grant select on routes,route_items,receipts,receipt_events to authenticated;
grant select,update on system_settings to authenticated;

-- Resolve authoritative data on the server; no donor/amount snapshots accepted from clients.
create function public.collection_candidates() returns table(source_kind text,source_id uuid,snapshot jsonb)
language sql stable security definer set search_path=public as $$
 select s.kind,s.id,jsonb_build_object('donor_name',s.name,'document',d.document_id,'phone',d.phone,
 'address',concat_ws(', ',nullif(d.address,''),nullif(d.address_number,''),nullif(d.complement,''),nullif(d.neighborhood,''),nullif(d.city,''),nullif(d.state,''),nullif(d.zip_code,'')),
 'neighborhood',d.neighborhood,'zip_code',d.zip_code,'description',s.description,'quantity',s.quantity,'amount',s.amount)
 from (
 select 'physical' kind,f.id,f.donor_id,f.donor_name name,coalesce(nullif(f.descricao,''),f.tipo_doacao) description,f.quantidade quantity,null::numeric amount from doacoes_fisicas f where f.status='pendente'
 union all
 select 'cash',c.id,c.donor_id,c.donor_name,'Doação em espécie',null,c.amount from caixa_transacoes c where c.status='pendente' and c.payment_method='dinheiro'
 ) s join donors d on d.id=s.donor_id
 where collection_admin() and not exists(select 1 from route_items i where i.source_kind=s.kind and i.source_id=s.id)
$$;
create function public.dispatch_collection(p_request uuid,p_courier uuid,p_date date,p_shift text,p_items jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare rid uuid; entry jsonb; snap jsonb; item_id uuid; rec_id uuid; org jsonb; courier_data jsonb; idx integer:=0;
begin
 if not collection_admin() then raise exception 'Acesso restrito ao administrador'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select id into rid from routes where request_id=p_request;
 if rid is not null then return rid; end if;
 if p_date is null or p_date < (now() at time zone 'America/Sao_Paulo')::date or p_shift not in ('manha','tarde','noite') or p_shift is null then raise exception 'Data/turno inválidos'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Selecione entre 1 e 100 doações'; end if;
 select jsonb_build_object('name',name,'document',cpf) into courier_data from profiles where id=p_courier and role='motoboy' and status='Ativo' and nullif(cpf,'') is not null for share;
 if courier_data is null then raise exception 'Motoboy ativo com documento obrigatório'; end if;
 select jsonb_build_object('name',coalesce(nullif(s.legal_name,''),w.system_name),'cnpj',w.cnpj,'address',w.address,'logo_url',w.logo_url,'phone',w.phone,'email',w.email,'thank_you',s.thank_you,'bank_details',s.bank_details,'pix_key',s.pix_key,'legal_notice',s.legal_notice) into org from white_label_settings w cross join system_settings s where w.id=1 and s.id=1;
 if org is null or coalesce(org->>'cnpj','')='' then raise exception 'Configure os dados institucionais e CNPJ'; end if;
 -- Lock source records in stable order before checking availability.
 for entry in select value from jsonb_array_elements(p_items) order by value->>'source_kind',value->>'source_id' loop
 if entry->>'source_kind'='physical' then perform 1 from doacoes_fisicas where id=(entry->>'source_id')::uuid for update;
 elsif entry->>'source_kind'='cash' then perform 1 from caixa_transacoes where id=(entry->>'source_id')::uuid for update;
 else raise exception 'Tipo de doação inválido'; end if;
 end loop;
 insert into routes(request_id,courier_id,created_by,collection_date,shift) values(p_request,p_courier,auth.uid(),p_date,p_shift) returning id into rid;
 for entry in select value from jsonb_array_elements(p_items) loop
 select c.snapshot into snap from collection_candidates() c where c.source_kind=entry->>'source_kind' and c.source_id=(entry->>'source_id')::uuid;
 if snap is null or coalesce(snap->>'address','')='' or coalesce(snap->>'document','')='' then raise exception 'Doação indisponível ou cadastro sem endereço/documento'; end if;
 idx:=idx+1;
 insert into route_items(route_id,source_kind,source_id,position,snapshot) values(rid,entry->>'source_kind',(entry->>'source_id')::uuid,idx,snap) returning id into item_id;
 insert into receipts(route_item_id,organization,courier) values(item_id,org,courier_data) returning id into rec_id;
 insert into receipt_events(receipt_id,actor_id,event) values(rec_id,auth.uid(),'issued');
 end loop;
 return rid;
end $$;
create function public.transition_collection_receipt(p_receipt uuid,p_status text,p_reason text default null) returns void
language plpgsql security definer set search_path=public as $$
declare rec receipts; item route_items;
begin
 select * into rec from receipts where id=p_receipt for update;
 if not found then raise exception 'Recibo inexistente'; end if;
 select * into item from route_items where id=rec.route_item_id;
 if not can_read_collection(item.route_id) then raise exception 'Sem permissão'; end if;
 if p_status not in ('confirmed','cancelled','disputed') or p_status is null then raise exception 'Status inválido'; end if;
 if p_status <> 'confirmed' and (not collection_admin() or length(trim(coalesce(p_reason,'')))<5) then raise exception 'Administrador e justificativa obrigatórios'; end if;
 if rec.status<>'issued' and not (rec.status='confirmed' and p_status='disputed' and collection_admin()) then raise exception 'Baixa repetida ou transição inválida'; end if;
 if p_status='confirmed' then
 if item.source_kind='physical' then
 update doacoes_fisicas set status='recebido',recebido_em=now() where id=item.source_id and status='pendente';
 else update caixa_transacoes set status='confirmado',compensated_at=now() where id=item.source_id and status='pendente' and payment_method='dinheiro'; end if;
 if not found then raise exception 'Origem já baixada/cancelada. Solicite análise administrativa'; end if;
 end if;
 update receipts set status=p_status,confirmed_at=case when p_status='confirmed' then now() else confirmed_at end where id=p_receipt;
 insert into receipt_events(receipt_id,actor_id,event,reason) values(p_receipt,auth.uid(),p_status,p_reason);
end $$;
revoke all on function collection_candidates(),dispatch_collection(uuid,uuid,date,text,jsonb),transition_collection_receipt(uuid,text,text) from public;
grant execute on function collection_candidates(),dispatch_collection(uuid,uuid,date,text,jsonb),transition_collection_receipt(uuid,text,text) to authenticated;
commit;
