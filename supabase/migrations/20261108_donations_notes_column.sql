-- ============================================================
-- A tela de Telemarketing (src/pages/Telemarketing.tsx) já grava
-- um campo de observação (ex.: qual banco/gateway recebeu a doação)
-- ao registrar uma doação, mas a coluna nunca existiu em produção,
-- causando "Could not find the 'notes' column of 'donations'".
-- Coluna opcional, aditiva e reversível (DROP COLUMN desfaz).
-- ============================================================
alter table public.donations add column if not exists notes text;
