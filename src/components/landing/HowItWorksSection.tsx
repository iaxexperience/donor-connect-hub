import { motion } from "framer-motion";
import { UserPlus, Settings, Rocket, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Cadastre seus Doadores",
    description: "Importe sua base existente via CSV ou cadastre manualmente. O CRM organiza tudo automaticamente.",
  },
  {
    icon: Settings,
    title: "Configure Automações",
    description: "Defina regras de follow-up, templates de WhatsApp e configure a IA para personalizar mensagens.",
  },
  {
    icon: Rocket,
    title: "Ative as Campanhas",
    description: "O sistema agenda e envia follow-ups automaticamente, respeitando os intervalos por tipo de doador.",
  },
  {
    icon: TrendingUp,
    title: "Acompanhe Resultados",
    description: "Monitore KPIs no dashboard executivo e otimize suas estratégias com relatórios detalhados.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 bg-gradient-warm">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">Como Funciona</span>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-3 mb-4">
            Simples de começar, poderoso para escalar
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center relative"
            >
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-border" />
              )}
              <div className="w-16 h-16 rounded-2xl bg-gradient-hero flex items-center justify-center mx-auto mb-4 relative z-10">
                <step.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <span className="text-xs font-bold text-accent mb-2 block">Passo {i + 1}</span>
              <h3 className="font-heading font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
