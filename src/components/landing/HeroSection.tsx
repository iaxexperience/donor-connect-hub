import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Users, MessageCircle, BarChart3, Kanban,
  Brain, Webhook, Shield, Zap, ArrowRight, TrendingUp,
} from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden mesh-gradient">
      {/* Decorative Blur Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-indigo-500/20 blur-[100px]" />

      <div className="container mx-auto px-4 pt-32 pb-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-4 py-1.5 mb-8 shadow-glow"
            >
              <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/90">
                A Nova Era da Filantropia Digital
              </span>
            </motion.div>

            <h1 className="font-heading font-extrabold text-5xl md:text-6xl lg:text-7xl text-white leading-[1.1] mb-8 tracking-tight">
              Acelere sua <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-100">arrecadação</span> <br />
              com inteligência
            </h1>

            <p className="text-lg md:text-xl text-white/70 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed font-medium">
              O CRM mais completo do Brasil para o Terceiro Setor. Automatize follow-ups, gerencie doadores e escale seu impacto social de forma simples e eficiente.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
              <Button size="xl" className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl group rounded-2xl font-bold">
                Comece Agora
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="xl" variant="outline" className="border-white/30 bg-white/5 backdrop-blur-sm text-white hover:bg-white/10 rounded-2xl font-bold">
                Agendar Demonstração
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="mt-16 pt-8 border-t border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-6">Confiado por organizações de impacto</p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8 opacity-40 grayscale group hover:opacity-100 transition-opacity">
                <div className="font-heading font-black text-white text-xl">ESPERANÇA</div>
                <div className="font-heading font-black text-white text-xl">INSTITUTO.M</div>
                <div className="font-heading font-black text-white text-xl">FUNDAÇÃO_X</div>
                <div className="font-heading font-black text-white text-xl">VIVA.SAÚDE</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            className="relative"
          >
            {/* Main Mockup */}
            <div className="relative z-20 rounded-[2rem] overflow-hidden border border-white/20 shadow-2xl shadow-blue-900/40 animate-float">
              <img 
                src="/mockup.png" 
                alt="Pulse Doações Dashboard Mockup" 
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent pointer-events-none" />
            </div>

            {/* Decorative Floating Elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/30 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
            
            {/* Float Cards */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -right-8 top-1/4 z-30 glass p-4 rounded-2xl shadow-2xl hidden xl:block border-white/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-[10px] text-white/60 font-bold uppercase tracking-tighter">Doações Hoje</p>
                  <p className="text-lg font-bold text-white">+ R$ 12.450</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, delay: 1 }}
              className="absolute -left-12 bottom-1/4 z-30 glass p-4 rounded-2xl shadow-2xl hidden xl:block border-white/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] text-white/60 font-bold uppercase tracking-tighter">Novos Doadores</p>
                  <p className="text-lg font-bold text-white">124 nesta semana</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
