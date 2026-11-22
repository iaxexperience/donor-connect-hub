import { Suspense, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { useLocation, useOutlet } from "react-router-dom";

// Quantas telas ficam guardadas ao mesmo tempo (as mais antigas saem primeiro).
const MAX_PAGES = 15;

// Telas de formulário de um registro (novo/editar) sempre abrem do zero:
// guardar o formulário de um doador e mostrar ao abrir outro confundiria.
const NEVER_KEEP = /\/(novo|editar)(\/|$)/;

const PageFallback = (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
  </div>
);

/**
 * Mantém as telas já visitadas montadas (escondidas) em vez de descartá-las.
 * Ao sair e voltar, a tela reaparece exatamente como estava: dados carregados,
 * filtros, buscas, abas, campos digitados e a posição da rolagem.
 *
 * Fica só na memória da aba: ao sair do sistema (logout) ou recarregar a
 * página (F5), tudo é descartado — nada de dados de doadores no navegador.
 */
export function KeepAliveOutlet({ scrollRef }: { scrollRef: RefObject<HTMLElement> }) {
  const outlet = useOutlet();
  const { pathname } = useLocation();
  const key = pathname.replace(/\/+$/, "").toLowerCase() || "/";
  const keep = !NEVER_KEEP.test(key);

  const pages = useRef(new Map<string, ReactNode>());
  const scrolls = useRef(new Map<string, number>());
  const current = useRef(key);

  if (keep && outlet) {
    if (pages.current.has(key)) {
      // Move para o fim (mais recente) sem trocar o elemento: a tela continua viva.
      const el = pages.current.get(key);
      pages.current.delete(key);
      pages.current.set(key, el);
    } else {
      pages.current.set(key, outlet);
      while (pages.current.size > MAX_PAGES) {
        const oldest = pages.current.keys().next().value as string;
        pages.current.delete(oldest);
        scrolls.current.delete(oldest);
      }
    }
  }

  // Guarda a rolagem da tela que saiu e devolve a da tela que voltou.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || current.current === key) return;
    scrolls.current.set(current.current, el.scrollTop);
    current.current = key;
    el.scrollTop = scrolls.current.get(key) ?? 0;
  }, [key, scrollRef]);

  return (
    <>
      {[...pages.current.entries()].map(([k, el]) => (
        <div key={k} hidden={k !== key || !keep} className={k === key && keep ? "" : "hidden"}>
          <Suspense fallback={PageFallback}>{el}</Suspense>
        </div>
      ))}
      {!keep && <Suspense fallback={PageFallback}>{outlet}</Suspense>}
    </>
  );
}
