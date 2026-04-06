import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Users, TrendingUp, MessageCircle } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-hero">
      {/* Decorative circles */}
      <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-primary-foreground/5 blur-3xl" />

      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-medium text-primary-foreground/80">
                Plataforma Inteligente de Arrecadação
              </span>
            </div>

            <h1 className="font-heading font-extrabold text-4xl md:text-5xl lg:text-6xl text-primary-foreground leading-tight mb-6">
              Transforme sua{" "}
              <span className="text-gradient-accent">arrecadação</span>{" "}
              com automação e inteligência
            </h1>

            <p className="text-lg md:text-xl text-primary-foreground/70 max-w-xl mx-auto lg:mx-0 mb-8">
              CRM de doadores, automação de follow-up via WhatsApp e IA para personalização.
              Tudo em uma única plataforma.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="hero" size="xl">
                Comece Gratuitamente
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="heroOutline" size="xl">
                Agendar Demo
              </Button>
            </div>

            <div className="flex items-center gap-8 mt-10 justify-center lg:justify-start">
              {[
                { value: "10K+", label: "Doadores Geridos" },
                { value: "R$2M+", label: "Arrecadados" },
                { value: "98%", label: "Satisfação" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="font-heading font-bold text-2xl text-primary-foreground">{stat.value}</p>
                  <p className="text-xs text-primary-foreground/60">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Floating cards */}
              <div className="bg-card/10 backdrop-blur-xl rounded-2xl border border-primary-foreground/10 p-6 shadow-elevated">
                <div className="grid grid-cols-2 gap-4">
                  <FloatingCard
                    icon={<Users className="w-5 h-5 text-accent" />}
                    title="CRM Completo"
                    desc="Visão 360° do doador"
                    delay={0}
                  />
                  <FloatingCard
                    icon={<MessageCircle className="w-5 h-5 text-accent" />}
                    title="WhatsApp"
                    desc="Follow-up automático"
                    delay={1}
                  />
                  <FloatingCard
                    icon={<TrendingUp className="w-5 h-5 text-accent" />}
                    title="Dashboard"
                    desc="Métricas em tempo real"
                    delay={2}
                  />
                  <FloatingCard
                    icon={<ArrowRight className="w-5 h-5 text-accent" />}
                    title="Kanban"
                    desc="Pipeline de doadores"
                    delay={3}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FloatingCard = ({
  icon,
  title,
  desc,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  delay: number;
}) => (
  <motion.div
    animate={{ y: [0, -6, 0] }}
    transition={{ duration: 4, repeat: Infinity, delay: delay * 0.5 }}
    className="bg-card/20 backdrop-blur-md rounded-xl border border-primary-foreground/10 p-4"
  >
    <div className="mb-2">{icon}</div>
    <p className="font-heading font-semibold text-sm text-primary-foreground">{title}</p>
    <p className="text-xs text-primary-foreground/60">{desc}</p>
  </motion.div>
);

export default HeroSection;
