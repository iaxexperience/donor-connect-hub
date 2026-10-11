-- ============================================================
-- Libera o coordenador para salvar em "Configurações" (dados
-- institucionais/CNPJ, identidade visual etc.) na tabela
-- white_label_settings, que hoje só permite role='admin'.
-- Necessário porque dispatch_collection() exige CNPJ configurado
-- e o coordenador é quem opera o módulo de coleta no dia a dia.
-- ============================================================

drop policy if exists "Escrita admin" on public.white_label_settings;

create policy "Escrita admin" on public.white_label_settings
  for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','coordenador')))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','coordenador')));
