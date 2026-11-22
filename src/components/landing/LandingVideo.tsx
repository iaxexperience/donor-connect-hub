import { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  poster: string;
  className?: string;
  /** Vídeo do topo da página: começa a carregar na hora. */
  eager?: boolean;
  label: string;
}

/**
 * Vídeo de fundo leve: sem som, em loop, só toca quando está visível na
 * tela e não toca para quem pediu "reduzir movimento" no sistema (mostra só
 * a imagem de capa). Fora do topo, só baixa o arquivo quando chega perto.
 */
export function LandingVideo({ src, poster, className = "", eager = false, label }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);
  const [near, setNear] = useState(eager);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          el.play().catch(() => { /* navegador bloqueou autoplay: fica a capa */ });
        } else {
          el.pause();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  if (reduced) {
    return <img src={poster} alt={label} className={className} />;
  }

  return (
    <video
      ref={ref}
      className={className}
      poster={poster}
      muted
      loop
      playsInline
      autoPlay={near}
      preload={eager ? "auto" : "none"}
      aria-label={label}
      src={near ? src : undefined}
    />
  );
}
