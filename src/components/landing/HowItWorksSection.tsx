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
    <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <div className="inline-block px-3 py-1 rounded-full bg-slate-100 border border-slate-200 mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Fluxo de Trabalho</span>
          </div>
          <h2 className="font-heading font-extrabold text-4xl text-slate-900 mt-3 mb-4 tracking-tight">
            Simples de começar, <span className="text-blue-600">poderoso para escalar</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-12">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group text-center relative"
            >
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-full h-[2px] bg-slate-100 group-hover:bg-blue-100 transition-colors" />
              )}
              <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-8 relative z-10 shadow-xl shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                <step.icon className="w-10 h-10 text-white" />
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white text-blue-600 flex items-center justify-center font-black text-xs shadow-md border border-slate-100">
                  {i + 1}
                </div>
              </div>
              <h3 className="font-heading font-bold text-slate-900 text-xl mb-4">{step.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed px-4">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
