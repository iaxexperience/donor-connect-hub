-- ============================================================
-- Assinatura digitalizada dos usuários (imagem PNG/JPG), usada
-- nos recibos emitidos por cada pessoa.
--
--  * profiles.signature_path: caminho do arquivo no bucket.
--  * bucket "signatures" PRIVADO (a imagem não fica pública na
--    internet; o sistema gera um link temporário ao emitir o PDF).
--  * Cada usuário pode enviar/trocar a própria assinatura;
--    admin e coordenador podem gerenciar a de qualquer pessoa.
--  * Qualquer usuário logado pode LER (necessário para, por ex.,
--    o coordenador imprimir o recibo de coleta de um mensageiro).
-- Idempotente.
-- ============================================================
begin;

alter table public.profiles add column if not exists signature_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('signatures', 'signatures', false, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists signatures_read on storage.objects;
drop policy if exists signatures_insert on storage.objects;
drop policy if exists signatures_update on storage.objects;
drop policy if exists signatures_delete on storage.objects;

-- Arquivos ficam em "<id do usuário>/arquivo.png".
create policy signatures_read on storage.objects for select to authenticated
  using (bucket_id = 'signatures');

create policy signatures_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'signatures'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.can_manage_collection())
  );

create policy signatures_update on storage.objects for update to authenticated
  using (
    bucket_id = 'signatures'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.can_manage_collection())
  );

create policy signatures_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'signatures'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.can_manage_collection())
  );

commit;
