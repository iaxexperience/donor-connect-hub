import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-24 bg-blue-600 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-blue-400/20 blur-[120px] animate-pulse-glow" />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-indigo-500/30 blur-[100px]" />

      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-8 backdrop-blur-md">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white">Comece Agora</span>
          </div>
          <h2 className="font-heading font-black text-4xl md:text-6xl text-white mb-8 tracking-tighter leading-[1.1]">
            Pronto para revolucionar <br />
            sua captação de recursos?
          </h2>
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium">
            Junte-se a centenas de organizações que já aceleraram seu impacto social com a inteligência do FAP Pulse.
          </p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <Button size="xl" className="bg-white text-blue-600 hover:bg-blue-50 shadow-2xl rounded-2xl font-bold px-10" asChild>
              <Link to="/cadastro">
                Criar Conta Grátis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10 rounded-2xl font-bold px-10 backdrop-blur-sm" asChild>
              <a href="https://api.whatsapp.com/send?phone=5583996583281&text=Olá!%20Gostaria%20de%20falar%20com%20um%20consultor%20do%20Pulse%20Doações." target="_blank" rel="noopener noreferrer">
                Falar com Consultor
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
