-- ============================================================
-- IAX GUARDIAN — envio de eventos de segurança (blue team)
--
-- O Pulse só ENVIA eventos para o Guardian (login falho, troca de papel,
-- usuário desativado/reativado). O Guardian nunca acessa este banco.
--
--  * guardian_settings: URL de ingestão, chave (x-api-key), identificador
--    da organização e liga/desliga. Só ADMIN lê/altera. A Edge Function
--    "guardian-event" lê com service role e faz o envio — a chave nunca vai
--    para o navegador de quem não é admin.
--  * guardian_event_attempts: limite de eventos sem login por IP (hash).
-- Idempotente.
-- ============================================================
begin;

create table if not exists public.guardian_settings (
  id integer primary key default 1 check (id = 1),
  ingest_url text not null default 'https://iaxguardian.com.br/api/public/ingest-event',
  api_key text,
  source_company_id text not null default 'pulse-doacoes',
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
insert into public.guardian_settings (id) values (1) on conflict (id) do nothing;

create or replace function public.is_active_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'Ativo')
$$;
revoke all on function public.is_active_admin() from public, anon;
grant execute on function public.is_active_admin() to authenticated;

alter table public.guardian_settings enable row level security;
drop policy if exists guardian_settings_admin on public.guardian_settings;
create policy guardian_settings_admin on public.guardian_settings for all to authenticated
  using (public.is_active_admin()) with check (public.is_active_admin());
revoke all on public.guardian_settings from anon;
grant select, insert, update on public.guardian_settings to authenticated;

create table if not exists public.guardian_event_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists guardian_event_attempts_ip_idx
  on public.guardian_event_attempts (ip_hash, created_at desc);
alter table public.guardian_event_attempts enable row level security;
revoke all on public.guardian_event_attempts from anon, authenticated;

commit;
