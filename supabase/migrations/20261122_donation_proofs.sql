-- ============================================================
-- COMPROVANTE DE DEPÓSITO/PIX anexado à doação (imagem ou PDF).
--
--  * donations.proof_path: caminho do arquivo no bucket.
--  * bucket "comprovantes" PRIVADO: comprovante bancário tem dado
--    pessoal (nome, CPF parcial, banco) — nunca fica público; a tela
--    abre por link temporário.
--  * Upload: usuários logados, sempre dentro da pasta com o próprio id
--    ("<id do usuário>/arquivo"). Leitura: usuários logados.
-- Idempotente.
-- ============================================================
begin;

alter table public.donations add column if not exists proof_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 10485760,
        array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists comprovantes_read on storage.objects;
drop policy if exists comprovantes_insert on storage.objects;
drop policy if exists comprovantes_delete on storage.objects;

create policy comprovantes_read on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes');

create policy comprovantes_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy comprovantes_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'comprovantes'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.can_manage_collection())
  );

commit;
