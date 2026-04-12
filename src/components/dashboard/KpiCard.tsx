import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type KpiColor = "green" | "red" | "orange" | "blue" | "purple" | "indigo" | "amber" | "teal";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: KpiColor;
  className?: string;
  delay?: number;
}

const colorMap: Record<KpiColor, { 
  bg: string, 
  icon: string, 
  iconBg: string, 
  wavePrimary: string, 
  waveSecondary: string,
  text: string 
}> = {
  green: { 
    bg: "bg-[#eaf8f0]", 
    icon: "text-[#1cb954]", 
    iconBg: "bg-[#d1f2e0]", 
    wavePrimary: "#1cb954", 
    waveSecondary: "#86efac",
    text: "text-slate-900" 
  },
  red: { 
    bg: "bg-[#fdf2f2]", 
    icon: "text-[#d93025]", 
    iconBg: "bg-[#fbe0dc]", 
    wavePrimary: "#d93025", 
    waveSecondary: "#f87171",
    text: "text-slate-900" 
  },
  orange: { 
    bg: "bg-[#fff8e6]", 
    icon: "text-[#f4b400]", 
    iconBg: "bg-[#ffefc2]", 
    wavePrimary: "#f4b400", 
    waveSecondary: "#fbbf24",
    text: "text-slate-900" 
  },
  blue: { 
    bg: "bg-[#eef4ff]", 
    icon: "text-[#1a73e8]", 
    iconBg: "bg-[#d2e3fc]", 
    wavePrimary: "#1a73e8", 
    waveSecondary: "#60a5fa",
    text: "text-slate-900" 
  },
  purple: { 
    bg: "bg-[#f5eeff]", 
    icon: "text-[#9334e1]", 
    iconBg: "bg-[#ead6ff]", 
    wavePrimary: "#9334e1", 
    waveSecondary: "#c084fc",
    text: "text-slate-900" 
  },
  indigo: { 
    bg: "bg-[#eef2ff]", 
    icon: "text-[#4f46e5]", 
    iconBg: "bg-[#e0e7ff]", 
    wavePrimary: "#4f46e5", 
    waveSecondary: "#818cf8",
    text: "text-slate-900" 
  },
  amber: { 
    bg: "bg-[#fffbeb]", 
    icon: "text-[#d97706]", 
    iconBg: "bg-[#fef3c7]", 
    wavePrimary: "#d97706", 
    waveSecondary: "#fbbf24",
    text: "text-slate-900" 
  },
  teal: { 
    bg: "bg-[#f0fdfa]", 
    icon: "text-[#0d9488]", 
    iconBg: "bg-[#ccfbf1]", 
    wavePrimary: "#0d9488", 
    waveSecondary: "#2dd4bf",
    text: "text-slate-900" 
  },
};

export const KpiCard = ({ title, value, icon: Icon, color, className, delay = 0 }: KpiCardProps) => {
  const theme = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 shadow-sm border border-transparent transition-all hover:shadow-md h-full flex flex-col justify-between",
        theme.bg,
        className
      )}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className={cn("p-2 rounded-xl shrink-0", theme.iconBg)}>
            <Icon className={cn("w-5 h-5", theme.icon)} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 truncate">
            {title}
          </span>
        </div>
        
        <div className={cn("text-4xl font-extrabold tracking-tight", theme.text)}>
          {value}
        </div>
      </div>

      {/* Wavy Background SVG */}
      <div className="absolute bottom-0 left-0 w-full h-12 pointer-events-none overflow-hidden">
        <svg
          viewBox="0 0 400 60"
          preserveAspectRatio="none"
          className="absolute bottom-0 w-full h-full"
        >
          {/* Bottom Wave - Secondary Color */}
          <path
            d="M 0 40 Q 100 20 200 40 T 400 40 L 400 60 L 0 60 Z"
            fill={theme.waveSecondary}
            opacity="0.3"
          />
          {/* Top Wave - Primary Color */}
          <path
            d="M 0 30 Q 100 50 200 30 T 400 30 L 400 60 L 0 60 Z"
            fill={theme.wavePrimary}
          />
        </svg>
      </div>
    </motion.div>
  );
};
