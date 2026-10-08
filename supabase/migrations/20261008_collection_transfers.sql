begin;
alter table public.doacoes_fisicas add column if not exists transferido boolean not null default false;
alter table public.doacoes_fisicas add column if not exists transferido_para text;
alter table public.doacoes_fisicas add column if not exists transferido_em timestamptz;
create table public.collection_transfers (
 id uuid primary key, created_at timestamptz not null default now(), created_by uuid not null references public.profiles(id), document jsonb not null
);
alter table public.collection_transfers enable row level security;
create policy transfer_read on public.collection_transfers for select to authenticated using(exists(select 1 from profiles where id=auth.uid() and role in ('admin','gestor','operador','caixa') and status='Ativo'));
grant select on public.collection_transfers to authenticated;
create function public.confirm_collection_transfer(p_id uuid,p_ids uuid[],p_sector uuid,p_notes text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare sector jsonb; donation doacoes_fisicas; donations jsonb:='[]'; result jsonb; org jsonb; stamp timestamptz:=now();
begin
 if not exists(select 1 from profiles where id=auth.uid() and role in ('admin','gestor','operador','caixa') and status='Ativo') then raise exception 'Sem permissão'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select document into result from collection_transfers where id=p_id;
 if result is not null then return result; end if;
 if coalesce(cardinality(p_ids),0) not between 1 and 100 then raise exception 'Selecione entre 1 e 100 doações'; end if;
 select to_jsonb(s) into sector from setores s where id=p_sector;
 if sector is null then raise exception 'Setor inválido'; end if;
 for donation in select * from doacoes_fisicas where id=any(p_ids) order by id for update loop
 if donation.status='cancelado' or donation.transferido or coalesce(donation.observacoes,'') like '%[Transferido para:%' then raise exception 'Doação cancelada ou já transferida'; end if;
 donations:=donations||jsonb_build_array(to_jsonb(donation));
 end loop;
 if jsonb_array_length(donations)<>cardinality(p_ids) then raise exception 'Seleção inválida'; end if;
 update doacoes_fisicas set transferido=true,transferido_para=sector->>'nome',transferido_em=stamp,
 observacoes=concat('[Transferido para: ',sector->>'nome','] ',coalesce(p_notes,''),' | ',observacoes) where id=any(p_ids);
 select to_jsonb(w) into org from white_label_settings w where id=1;
 result:=jsonb_build_object('numero','TRF-'||p_id::text,'data',to_char(stamp at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI'),'origem','Telemarketing & Relacionamento','setor_destino',sector->>'nome','coordenador',sector->>'coordenador_nome','coordenador_email',sector->>'coordenador_email','coordenador_telefone',sector->>'coordenador_telefone','ramal',sector->>'ramal','doacoes',donations,'obs',p_notes,'org',coalesce(org,'{}'));
 insert into collection_transfers(id,created_by,document) values(p_id,auth.uid(),result);
 return result;
end $$;
revoke all on function confirm_collection_transfer(uuid,uuid[],uuid,text) from public;
grant execute on function confirm_collection_transfer(uuid,uuid[],uuid,text) to authenticated;
commit;
