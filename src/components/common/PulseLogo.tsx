import React from 'react';

interface PulseLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  /** 'dark' = para fundo claro (texto azul-marinho); 'light' = para fundo escuro (texto branco). */
  variant?: 'light' | 'dark';
}

/**
 * Logomarca Pulse Doações: símbolo "P" em fitas azul e turquesa
 * (public/brand/pulse-icon.svg) + nome "pulse doações".
 * Arte completa original: public/brand/pulse-doacoes-logo.svg.
 */
const PulseLogo: React.FC<PulseLogoProps> = ({
  className = "",
  size = 40,
  showText = false,
  variant = 'dark',
}) => {
  const firstWord = variant === 'dark' ? 'text-[#061b3b]' : 'text-white';
  const secondWord = variant === 'dark'
    ? 'bg-gradient-to-r from-[#0499ee] via-[#0785e8] to-[#06a6df]'
    : 'bg-gradient-to-r from-[#38bdf8] via-[#22d3ee] to-[#2dd4bf]';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/brand/pulse-icon.svg"
        alt="Pulse Doações"
        width={size}
        height={size}
        className="shrink-0 object-contain drop-shadow-sm"
        style={{ width: size, height: size }}
      />
      {showText && (
        <span
          className="font-bold leading-none tracking-tight whitespace-nowrap"
          style={{ fontSize: Math.max(18, Math.round(size * 0.6)) }}
        >
          <span className={firstWord}>pulse</span>
          <span className={`ml-1.5 bg-clip-text text-transparent ${secondWord}`}>doações</span>
        </span>
      )}
    </div>
  );
};

export default PulseLogo;
