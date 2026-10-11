-- ============================================================
-- Coordenador pode cadastrar/editar usuários, exceto o papel
-- Administrador: não pode criar um admin, promover ninguém a
-- admin, nem editar um usuário que já é admin. Reforça em
-- banco (trigger) o que a Edge Function api-proxy/create_user e
-- a tela de Usuários já impedem na camada de aplicação, já que
-- a policy de profiles hoje é "Acesso Público" (sem restrição).
-- ============================================================

create or replace function public.protect_admin_role() returns trigger
language plpgsql security definer set search_path = public as $$
declare caller_role text;
begin
  select role into caller_role from profiles where id = auth.uid();
  if caller_role = 'coordenador' then
    if new.role = 'admin' then
      raise exception 'Coordenadores não podem cadastrar ou promover usuários a Administrador';
    end if;
    if tg_op = 'UPDATE' and old.role = 'admin' then
      raise exception 'Coordenadores não podem editar um usuário Administrador';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_admin_role on public.profiles;
create trigger trg_protect_admin_role
  before insert or update on public.profiles
  for each row execute function public.protect_admin_role();
