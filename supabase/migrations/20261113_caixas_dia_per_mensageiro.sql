-- ============================================================
-- Caixa individual por mensageiro: cada mensageiro abre/fecha seu
-- próprio caixa diário (operator_id = ele mesmo), sem enxergar nem
-- interferir no caixa global da organização (operator_id nulo,
-- usado por admin/operador de caixa/gestor/coordenador como hoje).
-- ============================================================

alter table caixas_dia add column if not exists operator_id uuid references public.profiles(id);

-- Remove a constraint/índice único antigo (um único caixa por data,
-- sem distinguir operador), procurando pelo nome real em produção
-- em vez de arriscar um nome incorreto.
do $$
declare v_conname text;
begin
  select con.conname into v_conname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'caixas_dia' and con.contype = 'u'
    and pg_get_constraintdef(con.oid) like '%data_movimento%';
  if v_conname is not null then
    execute format('alter table caixas_dia drop constraint %I', v_conname);
  end if;
end $$;

do $$
declare v_idxname text;
begin
  select indexname into v_idxname from pg_indexes
  where tablename = 'caixas_dia' and indexdef ilike '%unique%' and indexdef ilike '%data_movimento%'
  limit 1;
  if v_idxname is not null then
    execute format('drop index if exists %I', v_idxname);
  end if;
end $$;

-- Um caixa global por dia (operator_id nulo) + um caixa por mensageiro por dia.
create unique index if not exists caixas_dia_global_unique on caixas_dia(data_movimento) where operator_id is null;
create unique index if not exists caixas_dia_operator_unique on caixas_dia(data_movimento, operator_id) where operator_id is not null;
