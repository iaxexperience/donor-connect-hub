import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import PulseLogo from "@/components/common/PulseLogo";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = [
    { label: "Funcionalidades", href: "#features" },
    { label: "Como Funciona", href: "#how-it-works" },
    { label: "Depoimentos", href: "#testimonials" },
    { label: "FAQ", href: "#faq" },
    { label: "Contato", href: "#contact" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? "bg-white/80 backdrop-blur-xl border-b border-slate-200 py-3 shadow-sm" 
        : "bg-transparent py-5"
    }`}>
      <div className="container mx-auto flex items-center justify-between px-4">
        <a href="#" className="hover:scale-105 transition-transform duration-300">
          <PulseLogo 
            showText 
            size={45} 
            variant={scrolled ? 'dark' : 'light'} 
          />
        </a>

        <div className="hidden md:flex items-center gap-10">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm font-bold transition-all hover:translate-y-[-2px] ${
                scrolled 
                  ? "text-slate-600 hover:text-[#00C38B]" 
                  : "text-white/80 hover:text-white"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" className={`font-bold ${
            scrolled ? "text-slate-900 hover:bg-slate-100" : "text-white hover:bg-white/10"
          }`} asChild>
            <Link to="/login">Entrar</Link>
          </Button>
          <Button className={`font-bold shadow-lg rounded-xl px-6 ${
            scrolled
              ? "bg-[#001A3D] text-white hover:bg-[#002D62]"
              : "bg-[#00C38B] text-[#001A3D] hover:bg-[#00E0A1]"
          }`} asChild>
            <Link to="/cadastro">Cadastre-se</Link>
          </Button>
        </div>

        <button
          className={`md:hidden focus:outline-none ${scrolled ? "text-slate-900" : "text-white"}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" size="sm" className="flex-1" asChild>
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button size="sm" className="flex-1" asChild>
                  <Link to="/cadastro">Cadastre-se</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
