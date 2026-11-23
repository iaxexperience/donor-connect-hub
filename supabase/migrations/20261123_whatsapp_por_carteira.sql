-- ============================================================
-- WHATSAPP COMPARTILHADO POR CARTEIRA
--
-- Um único número de WhatsApp usado por vários usuários.
--
-- Quem vê o quê:
--   * admin, gestor e coordenador (ativos): todas as conversas.
--   * demais usuários (operadores do telemarketing): só as conversas
--       - de doadores da PRÓPRIA carteira (donors.assigned_operator_id),
--         reconhecidos pelo vínculo do chat (donor_id) ou pelo telefone; ou
--       - que um coordenador ENCAMINHOU para ele
--         (whatsapp_chats.assigned_operator_id).
--   * Contato desconhecido (sem doador e sem encaminhamento): só a
--     coordenação vê, até encaminhar para um operador.
--   * Excluir conversa ou limpar histórico: só admin/gestor/coordenador.
--
-- As Edge Functions (webhook da Meta, envio) usam a chave de serviço e
-- continuam gravando normalmente — estas regras valem para quem usa o site.
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================
begin;

-- ── 1. Encaminhamento de conversa para um operador ──────────
alter table public.whatsapp_chats
  add column if not exists assigned_operator_id uuid references public.profiles(id) on delete set null;
create index if not exists whatsapp_chats_assigned_operator_idx
  on public.whatsapp_chats (assigned_operator_id);
create index if not exists whatsapp_messages_chat_idx
  on public.whatsapp_messages (chat_id, created_at);

-- ── 2. Telefone padronizado (igual ao normalizePhone do site) ─
-- 55 + DDD + 8 últimos dígitos (ignora o 9º dígito e "55" repetido).
create or replace function public.wa_normalize_phone(p text)
returns text language plpgsql immutable as $$
declare c text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  while length(c) > 11 and c like '5555%' loop
    c := substr(c, 3);
  end loop;
  if c like '55%' and length(c) >= 12 then
    return '55' || substr(c, 3, 2) || right(c, 8);
  end if;
  if length(c) in (10, 11) then
    return '55' || substr(c, 1, 2) || right(c, 8);
  end if;
  return c;
end $$;

-- Acelera "doadores da minha carteira com este telefone".
create index if not exists donors_operator_phone_norm_idx
  on public.donors (assigned_operator_id, public.wa_normalize_phone(phone));

-- ── 3. Quem pode o quê ──────────────────────────────────────
create or replace function public.wa_sees_all()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
     where id = auth.uid() and status = 'Ativo'
       and role in ('admin', 'gestor', 'coordenador')
  )
$$;

create or replace function public.wa_is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'Ativo')
$$;

-- Conversa visível para o usuário logado?
create or replace function public.wa_can_access_chat(p_chat_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.wa_sees_all()
      or (public.wa_is_active_user() and exists (
            select 1
              from whatsapp_chats c
             where c.id = p_chat_id
               and (
                 c.assigned_operator_id = auth.uid()
                 or exists (
                   select 1 from donors d
                    where d.assigned_operator_id = auth.uid()
                      and (d.id = c.donor_id
                           or public.wa_normalize_phone(d.phone) = public.wa_normalize_phone(c.telefone))
                 )
               )
         ))
$$;

-- Doador da carteira do usuário logado (ou o usuário vê tudo)?
create or replace function public.wa_can_access_donor(p_donor_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.wa_sees_all()
      or (public.wa_is_active_user() and exists (
            select 1 from donors d where d.id = p_donor_id and d.assigned_operator_id = auth.uid()
         ))
$$;

revoke all on function public.wa_sees_all() from public, anon;
revoke all on function public.wa_is_active_user() from public, anon;
revoke all on function public.wa_can_access_chat(uuid) from public, anon;
revoke all on function public.wa_can_access_donor(bigint) from public, anon;
grant execute on function public.wa_sees_all() to authenticated;
grant execute on function public.wa_is_active_user() to authenticated;
grant execute on function public.wa_can_access_chat(uuid) to authenticated;
grant execute on function public.wa_can_access_donor(bigint) to authenticated;
grant execute on function public.wa_normalize_phone(text) to authenticated;

-- ── 4. Regras das tabelas (substituem o "todos veem tudo") ───
do $$
declare t text; p record;
begin
  foreach t in array array['whatsapp_chats', 'whatsapp_messages'] loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

-- Conversas
create policy wa_chats_select on public.whatsapp_chats for select to authenticated
  using ((select public.wa_sees_all()) or public.wa_can_access_chat(id));
create policy wa_chats_insert on public.whatsapp_chats for insert to authenticated
  with check (
    (select public.wa_sees_all())
    or (assigned_operator_id is null and donor_id is not null and public.wa_can_access_donor(donor_id))
  );
create policy wa_chats_update on public.whatsapp_chats for update to authenticated
  using ((select public.wa_sees_all()) or public.wa_can_access_chat(id))
  with check ((select public.wa_sees_all()) or public.wa_can_access_chat(id));
create policy wa_chats_delete on public.whatsapp_chats for delete to authenticated
  using ((select public.wa_sees_all()));

-- Mensagens
create policy wa_msgs_select on public.whatsapp_messages for select to authenticated
  using (
    (select public.wa_sees_all())
    or (chat_id is not null and public.wa_can_access_chat(chat_id))
    or (chat_id is null and donor_id is not null and public.wa_can_access_donor(donor_id))
  );
create policy wa_msgs_insert on public.whatsapp_messages for insert to authenticated
  with check (
    (select public.wa_sees_all())
    or (chat_id is not null and public.wa_can_access_chat(chat_id))
    or (chat_id is null and donor_id is not null and public.wa_can_access_donor(donor_id))
  );
create policy wa_msgs_update on public.whatsapp_messages for update to authenticated
  using (
    (select public.wa_sees_all())
    or (chat_id is not null and public.wa_can_access_chat(chat_id))
  );
create policy wa_msgs_delete on public.whatsapp_messages for delete to authenticated
  using ((select public.wa_sees_all()));

revoke all on public.whatsapp_chats, public.whatsapp_messages from anon;

-- Só a coordenação muda o encaminhamento (um operador não pode puxar
-- nem repassar conversa por conta própria).
create or replace function public.wa_guard_chat_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and new.assigned_operator_id is distinct from old.assigned_operator_id
     and not public.wa_sees_all() then
    raise exception 'Apenas a coordenação pode encaminhar conversas';
  end if;
  return new;
end $$;

drop trigger if exists wa_guard_chat_assignment on public.whatsapp_chats;
create trigger wa_guard_chat_assignment
  before update of assigned_operator_id on public.whatsapp_chats
  for each row execute function public.wa_guard_chat_assignment();

-- ── 5. Encaminhar conversa (coordenação) ────────────────────
-- p_operator_id = null devolve a conversa para a coordenação.
-- Aplica a todas as linhas do mesmo telefone (contatos duplicados).
create or replace function public.assign_whatsapp_chat(p_chat_id uuid, p_operator_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_phone text;
begin
  if not public.wa_sees_all() then
    raise exception 'Apenas administradores, gestores e coordenadores podem encaminhar conversas';
  end if;

  if p_operator_id is not null and not exists (
    select 1 from profiles where id = p_operator_id and role = 'operador' and status = 'Ativo'
  ) then
    raise exception 'Operador inválido ou inativo';
  end if;

  select public.wa_normalize_phone(telefone) into v_phone from whatsapp_chats where id = p_chat_id;
  if v_phone is null then
    raise exception 'Conversa não encontrada';
  end if;

  update whatsapp_chats
     set assigned_operator_id = p_operator_id
   where id = p_chat_id or public.wa_normalize_phone(telefone) = v_phone;

  insert into audit_logs (user_id, action, resource, details)
  values (auth.uid(), 'ASSIGN_WHATSAPP_CHAT', 'whatsapp_chats',
          jsonb_build_object('chat_id', p_chat_id, 'operator_id', p_operator_id));
end $$;

revoke all on function public.assign_whatsapp_chat(uuid, uuid) from public, anon;
grant execute on function public.assign_whatsapp_chat(uuid, uuid) to authenticated;

commit;
