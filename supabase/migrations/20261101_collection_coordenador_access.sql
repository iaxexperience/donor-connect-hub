-- ============================================================
-- Libera o papel "coordenador" para gerenciar o módulo de coleta
-- (rotas/itinerários), que hoje só aceita role='admin' via
-- collection_admin(). Introduz can_manage_collection() sem alterar
-- o significado de collection_admin() (usado em outros lugares).
-- ============================================================
begin;

create function public.can_manage_collection() returns boolean language sql stable security definer set search_path=public
as $$ select collection_admin() or exists(select 1 from profiles where id=auth.uid() and role='coordenador' and status='Ativo') $$;

-- Leitura de rotas/itens/recibos: admin e coordenador enxergam tudo,
-- motoboy continua só enxergando as próprias rotas.
create or replace function public.can_read_collection(p_route uuid) returns boolean language sql stable security definer set search_path=public
as $$ select can_manage_collection() or exists(select 1 from routes r join profiles p on p.id=r.courier_id where r.id=p_route and p.id=auth.uid() and p.role='motoboy' and p.status='Ativo') $$;

-- Histórico de eventos do recibo: admin e coordenador podem auditar.
drop policy if exists events_read on receipt_events;
create policy events_read on receipt_events for select to authenticated using(can_manage_collection());

-- Lista de candidatos à coleta: admin e coordenador podem montar itinerários.
create or replace function public.collection_candidates() returns table(source_kind text,source_id uuid,snapshot jsonb)
language sql stable security definer set search_path=public as $$
 select s.kind,s.id,jsonb_build_object('donor_name',s.name,'document',d.document_id,'phone',d.phone,
 'address',concat_ws(', ',nullif(d.address,''),nullif(d.address_number,''),nullif(d.complement,''),nullif(d.neighborhood,''),nullif(d.city,''),nullif(d.state,''),nullif(d.zip_code,'')),
 'neighborhood',d.neighborhood,'zip_code',d.zip_code,'description',s.description,'quantity',s.quantity,'amount',s.amount)
 from (
 select 'physical' kind,f.id,f.donor_id,f.donor_name name,coalesce(nullif(f.descricao,''),f.tipo_doacao) description,f.quantidade quantity,null::numeric amount from doacoes_fisicas f where f.status='pendente'
 union all
 select 'cash',c.id,c.donor_id,c.donor_name,'Doação em espécie',null,c.amount from caixa_transacoes c where c.status='pendente' and c.payment_method='dinheiro'
 ) s join donors d on d.id=s.donor_id
 where can_manage_collection() and not exists(select 1 from route_items i where i.source_kind=s.kind and i.source_id=s.id)
$$;

-- Despacho de rota: admin e coordenador podem atribuir mensageiro+itinerário.
create or replace function public.dispatch_collection(p_request uuid,p_courier uuid,p_date date,p_shift text,p_items jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare rid uuid; entry jsonb; snap jsonb; item_id uuid; rec_id uuid; org jsonb; courier_data jsonb; idx integer:=0;
begin
 if not can_manage_collection() then raise exception 'Acesso restrito a administradores e coordenadores'; end if;
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

-- Transição de recibo (confirmar/cancelar/contestar): admin e coordenador.
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
 else update caixa_transacoes set status='confirmado',compensated_at=now() where id=item.source_id and status='pendente' and payment_method='dinheiro'; end if;
 if not found then raise exception 'Origem já baixada/cancelada. Solicite análise administrativa'; end if;
 end if;
 update receipts set status=p_status,confirmed_at=case when p_status='confirmed' then now() else confirmed_at end where id=p_receipt;
 insert into receipt_events(receipt_id,actor_id,event,reason) values(p_receipt,auth.uid(),p_status,p_reason);
end $$;

commit;
