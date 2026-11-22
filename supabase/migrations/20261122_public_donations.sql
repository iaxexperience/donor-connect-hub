-- ============================================================
-- DOAÇÃO PELO SITE (Edge Function "public-donation")
--
--  * public_donation_attempts: controle de abuso (tentativas por IP,
--    guardado só como hash). Sem acesso para usuários — só a Edge
--    Function (service role) lê/escreve.
--  * donations.source: origem da doação ("site" para as que vêm da
--    landing page), para relatórios.
-- Idempotente.
-- ============================================================
begin;

create table if not exists public.public_donation_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists public_donation_attempts_ip_idx
  on public.public_donation_attempts (ip_hash, created_at desc);

alter table public.public_donation_attempts enable row level security;
revoke all on public.public_donation_attempts from anon, authenticated;

alter table public.donations add column if not exists source text;

commit;
