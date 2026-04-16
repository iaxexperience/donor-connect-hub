import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ThemeSettings {
  system_name: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string;
}

const ThemeContext = createContext<{
  settings: ThemeSettings;
  updateSettings: (newSettings: Partial<ThemeSettings>) => void;
}>({
  settings: {
    system_name: "Pulse Doações",
    primary_color: "#0066CC",
    secondary_color: "#2a9d8f",
    logo_url: "",
  },
  updateSettings: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const hexToHSL = (hex: string): string => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }

  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const DynamicThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<ThemeSettings>({
    system_name: "Pulse Doações",
    primary_color: "#0066CC",
    secondary_color: "#2a9d8f",
    logo_url: "",
  });

  const applyTheme = (s: ThemeSettings) => {
    const root = document.documentElement;
    
    // Apply Primary Color
    if (s.primary_color) {
      const hsl = hexToHSL(s.primary_color);
      root.style.setProperty("--primary", hsl);
      root.style.setProperty("--ring", hsl);
      root.style.setProperty("--sidebar-background", hsl);
    }

    // Apply Secondary/Accent Color
    if (s.secondary_color) {
      const secondaryHsl = hexToHSL(s.secondary_color);
      // We map the user's secondary color to the theme's secondary (which is usually muted)
      // and also potentially to accents.
      root.style.setProperty("--secondary", secondaryHsl);
    }

    // Apply System Name
    if (s.system_name) {
      document.title = s.system_name;
    }
  };

  useEffect(() => {
    const loadTheme = async () => {
      // 1. Load from LocalStorage (fastest)
      const local = localStorage.getItem('white_label_settings');
      if (local) {
        const parsed = JSON.parse(local);
        setSettings(parsed);
        applyTheme(parsed);
      }

      // 2. Load from Supabase (source of truth)
      try {
        const { data } = await supabase
          .from('white_label_settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();
        
        if (data) {
          const newSettings = {
            system_name: data.system_name || "Pulse Doações",
            primary_color: data.primary_color || "#0066CC",
            secondary_color: data.secondary_color || "#2a9d8f",
            logo_url: data.logo_url || "",
          };
          setSettings(newSettings);
          applyTheme(newSettings);
          localStorage.setItem('white_label_settings', JSON.stringify(data));
        }
      } catch (err) {
        console.error("Theme load error:", err);
      }
    };

    loadTheme();
  }, []);

  const updateSettings = (newSettings: Partial<ThemeSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    applyTheme(updated);
    localStorage.setItem('white_label_settings', JSON.stringify(updated));
  };

  return (
    <ThemeContext.Provider value={{ settings, updateSettings }}>
      {children}
    </ThemeContext.Provider>
  );
};
