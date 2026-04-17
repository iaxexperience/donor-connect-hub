import React from 'react';

interface PulseLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  variant?: 'light' | 'dark';
}

const PulseLogo: React.FC<PulseLogoProps> = ({ 
  className = "", 
  size = 40, 
  showText = false,
  variant = 'dark'
}) => {
  const mainColor = variant === 'dark' ? '#001A3D' : '#FFFFFF';
  const accentColor = '#00C38B';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        {/* Main Heart Shape (Left side solid, Right side dots/circuit) */}
        <path
          d="M50 85C50 85 15 65 15 35C15 18 35 15 50 30C65 15 85 18 85 35C85 65 50 85 50 85Z"
          fill={variant === 'dark' ? "rgba(0, 26, 61, 0.05)" : "rgba(255, 255, 255, 0.1)"}
          stroke={mainColor}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        
        {/* Pulse Line */}
        <path
          d="M20 50H35L42 30L52 70L60 45L65 50H80"
          stroke={accentColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-pulse"
        />

        {/* Circuit Dots on the right half */}
        <circle cx="70" cy="30" r="4" fill={accentColor} />
        <circle cx="78" cy="42" r="3" fill={accentColor} />
        <circle cx="72" cy="58" r="4" fill={accentColor} />
        <circle cx="62" cy="70" r="3" fill={accentColor} />
        
        {/* Connection lines for circuit look */}
        <path d="M70 30L78 42M78 42L72 58" stroke={accentColor} strokeWidth="1" opacity="0.3" />
      </svg>
      
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-heading font-black text-2xl tracking-tighter ${variant === 'dark' ? 'text-slate-900' : 'text-white'}`}>
            Pulse
            <span className="text-[#00C38B] ml-1">Doações</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default PulseLogo;
