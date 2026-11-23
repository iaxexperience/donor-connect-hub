import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Donor } from "@/lib/donationService";

export const DONORS_PAGE_SIZE = 100;

// Colunas mostradas na lista (sem endereço, documento etc.).
const LIST_COLUMNS = "id, name, email, phone, type, total_donated, last_donation_date";

/**
 * Texto da busca seguro para o filtro do Supabase: vírgula, parênteses, % e _
 * têm significado especial no filtro "or" / "ilike" e quebrariam a consulta.
 */
export const cleanSearch = (term: string) => term.replace(/[,()%_*\\]/g, " ").trim();

/** Espera a pessoa parar de digitar antes de buscar no banco. */
export const useDebounced = <T,>(value: T, ms = 350) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

const normalize = (d: any): Donor => ({
  ...d,
  name: d.name || "Doador sem Nome",
  email: d.email || "sem@email.com",
  total_donated: d.total_donated || 0,
  donation_count: d.donation_count || 0,
});

/**
 * Lista de doadores carregada de 100 em 100, com busca e filtro feitos no banco.
 * A chave começa com 'donors': cadastrar, editar, excluir ou importar (que
 * invalidam 'donors') atualizam esta lista também.
 */
export const useDonorsPaged = (search: string, type: string) => {
  const term = cleanSearch(search);

  const query = useInfiniteQuery({
    queryKey: ["donors", "paged", term, type],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * DONORS_PAGE_SIZE;
      let q = supabase
        .from("donors")
        .select(LIST_COLUMNS, { count: "exact" })
        .order("name", { ascending: true })
        .order("id", { ascending: true }) // desempate estável entre páginas
        .range(from, from + DONORS_PAGE_SIZE - 1);
      if (type !== "all") q = q.eq("type", type);
      if (term) q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%`);

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []).map(normalize), total: count ?? 0, page: pageParam };
    },
    getNextPageParam: (last) =>
      (last.page + 1) * DONORS_PAGE_SIZE < last.total ? last.page + 1 : undefined,
    staleTime: 2 * 60_000,
  });

  const donors = query.data?.pages.flatMap((p) => p.rows) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return {
    donors,
    total,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    loadMore: () => query.fetchNextPage(),
    hasMore: !!query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    error: query.error,
  };
};

/** Total de doadores cadastrados (só a contagem, sem baixar a lista). */
export const useDonorsCount = () =>
  useQuery({
    queryKey: ["donors", "count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("donors")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 2 * 60_000,
  });

/** Busca rápida de doadores pelo nome (no máximo 20 resultados) para seletores. */
export const useDonorLookup = (search: string) => {
  const term = cleanSearch(useDebounced(search, 300));
  return useQuery({
    queryKey: ["donors", "lookup", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donors")
        .select("id, name, phone")
        .ilike("name", `%${term}%`)
        .order("name")
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
};
