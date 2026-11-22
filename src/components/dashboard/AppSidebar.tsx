import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, Moon, Sun, HelpCircle, LogOut, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/theme/DynamicThemeProvider";
import { navSectionsForRole, itemForPath, sectionForPath } from "@/lib/navigation";

const PIN_KEY = "pulse_sidebar_pinned";

const readPinned = () => {
  try {
    return localStorage.getItem(PIN_KEY) !== "false";
  } catch {
    return true;
  }
};

// Texto para a busca: minúsculo e sem acento ("doacoes" acha "Doações").
const fold = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface Props {
  /** Menu aberto como gaveta no celular. */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

/**
 * Menu lateral no padrão FinFlow: barra estreita com um ícone colorido por
 * grupo e, ao lado, o painel com os itens do grupo selecionado. O painel pode
 * ser fixado; solto, ele abre ao passar o mouse e fecha ao sair.
 */
export function AppSidebar({ mobileOpen, onMobileClose }: Props) {
  const { role, signOut } = useAuth();
  const { settings: { system_name: systemName, logo_url: logoUrl } } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const sections = useMemo(() => navSectionsForRole(role), [role]);
  const [activeLabel, setActiveLabel] = useState<string | undefined>(() => sectionForPath(sections, pathname));
  const [pinned, setPinned] = useState(readPinned);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const panelVisible = pinned || hoverOpen || mobileOpen;
  const activeSection = sections.find((s) => s.label === activeLabel) ?? sections[0];
  const activeItem = itemForPath(sections, pathname);

  useEffect(() => {
    const label = sectionForPath(sections, pathname);
    if (label) setActiveLabel(label);
    onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, sections]);

  const setPinnedPersisted = (next: boolean) => {
    setPinned(next);
    try { localStorage.setItem(PIN_KEY, String(next)); } catch { /* sem armazenamento */ }
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("pulse_theme", next ? "dark" : "light"); } catch { /* */ }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const allItems = useMemo(
    () => sections.flatMap((s) => s.items.map((i) => ({ ...i, sectionLabel: s.label }))),
    [sections]
  );
  const results = useMemo(() => {
    const q = fold(query);
    return q ? allItems.filter((i) => fold(i.label).includes(q)) : allItems;
  }, [allItems, query]);

  const closeSearch = () => { setSearchOpen(false); setQuery(""); };
  const go = (to: string) => { navigate(to); closeSearch(); };

  const railBtn = "h-10 w-10 grid place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors";

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-[45] bg-black/50 lg:hidden" onClick={onMobileClose} />}

      <div
        className={`flex h-full shrink-0 fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onMouseEnter={() => setHoverOpen(true)}
        onMouseLeave={() => setHoverOpen(false)}
      >
        {/* ── Barra de ícones ─────────────────────────────── */}
        <div className="w-16 h-full bg-[#050B14] flex flex-col items-center py-3 gap-1 shrink-0">
          <button type="button" onClick={() => setSearchOpen(true)} title="Pulse Doações — buscar menu" className="mb-3 shrink-0">
            <img src="/brand/pulse-icon.svg" alt="Pulse Doações" className="h-9 w-9 object-contain" />
          </button>
          <div className="w-8 border-t border-white/10 mb-2" />

          <nav className="flex-1 overflow-y-auto flex flex-col items-center gap-1 w-full min-w-0">
            {sections.map((section) => {
              const Icon = section.railIcon;
              const isActive = section.label === activeSection?.label;
              return (
                <button
                  key={section.label}
                  type="button"
                  title={section.label}
                  onClick={() => { setActiveLabel(section.label); setHoverOpen(true); }}
                  className={`h-11 w-11 grid place-items-center rounded-lg shrink-0 transition-all hover:bg-white/5 ${isActive ? "bg-white/10" : ""}`}
                  style={isActive ? { boxShadow: `inset 3px 0 0 ${section.accent}` } : undefined}
                >
                  <Icon className={`h-[22px] w-[22px] transition-opacity ${isActive ? "opacity-100" : "opacity-55"}`} color={section.accent} />
                </button>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col items-center gap-1 pt-2 border-t border-white/10 w-full">
            <button type="button" onClick={toggleTheme} title={isDark ? "Tema claro" : "Tema escuro"} className={railBtn}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link to="/documentacao" title="Central de Ajuda" className={railBtn}>
              <HelpCircle className="h-5 w-5" />
            </Link>
            <button type="button" onClick={handleSignOut} title="Sair" className={railBtn}>
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Painel expandido ────────────────────────────── */}
        <aside
          className={`bg-[#0B1522] text-white flex flex-col h-full overflow-hidden transition-all duration-200 ${
            panelVisible ? "w-64 max-w-[calc(100vw-4rem)]" : "w-0"
          }`}
        >
          <div className="p-4 border-b border-[#152538]">
            <div className="rounded-md bg-white/5 px-3 py-2 flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-white overflow-hidden grid place-items-center shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
                ) : (
                  <Heart className="h-4 w-4 text-orange-500" fill="currentColor" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate leading-tight">{systemName}</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 truncate">Fundação Assistencial</p>
              </div>
            </div>
          </div>

          {activeSection && (
            <>
              <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: activeSection.accent, boxShadow: `0 0 6px ${activeSection.accent}` }}
                />
                <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: activeSection.accent, opacity: 0.85 }}>
                  {activeSection.label}
                </span>
              </div>

              <nav className="flex-1 overflow-y-auto px-2 pb-2 mt-1 space-y-0.5 min-w-0">
                {activeSection.items.map((item) => {
                  const isActive = activeItem === item;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] whitespace-nowrap transition-all ${
                        isActive ? "bg-[#1C2C40] text-white font-semibold" : "text-white/75 hover:bg-white/5 hover:text-white"
                      }`}
                      style={isActive ? { boxShadow: `inset 3px 0 0 ${activeSection.accent}` } : undefined}
                    >
                      <item.icon className="h-5 w-5 shrink-0" color={isActive ? activeSection.accent : undefined} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </>
          )}

          <div className="p-3 border-t border-[#152538] hidden lg:block">
            <label className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-[15px] text-white/75 cursor-pointer whitespace-nowrap">
              <span>Fixar menu</span>
              <Switch checked={pinned} onCheckedChange={setPinnedPersisted} />
            </label>
          </div>
        </aside>
      </div>

      {/* ── Busca de menu (clique no logo) ─────────────────── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 grid place-items-start justify-center pt-24 p-4" onClick={closeSearch}>
          <div className="w-full max-w-md rounded-xl bg-card border shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") closeSearch();
                  if (e.key === "Enter" && results[0]) go(results[0].to);
                }}
                placeholder="Buscar menu..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum menu encontrado.</p>
              ) : (
                results.map((item) => (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => go(item.to)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-left hover:bg-accent"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{item.sectionLabel}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
