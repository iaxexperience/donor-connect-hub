import { motion } from "framer-motion";
import {
  Users, MessageCircle, BarChart3, Kanban,
  Brain, Webhook, Shield, Zap, ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "CRM de Doadores",
    description: "Cadastro completo, histórico de doações, score de lealdade e visão 360° de cada doador.",
  },
  {
    icon: MessageCircle,
    title: "Automação WhatsApp",
    description: "Follow-up automático com templates personalizados e retry exponencial para máxima entrega.",
  },
  {
    icon: Kanban,
    title: "Kanban Inteligente",
    description: "Classifique doadores automaticamente: Único, Esporádico, Recorrente. Arrastar e soltar.",
  },
  {
    icon: Brain,
    title: "IA Personalizada",
    description: "Configure LLMs para gerar roteiros de telemarketing e personalizar mensagens.",
  },
  {
    icon: BarChart3,
    title: "Dashboard Executivo",
    description: "KPIs em tempo real, gráficos interativos e drill-down para decisões estratégicas.",
  },
  {
    icon: Webhook,
    title: "Integrações Flexíveis",
    description: "Conecte com N8N, GPT Maker, APIs bancárias, gateways de pagamento e mais.",
  },
  {
    icon: Shield,
    title: "Segurança & LGPD",
    description: "Criptografia, RBAC, RLS, auditoria completa e conformidade com a LGPD.",
  },
  {
    icon: Zap,
    title: "Relatórios Avançados",
    description: "Relatórios com filtros configuráveis, exportação CSV/PDF e agendamento automático.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/40 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-200/40 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <div className="inline-block px-3 py-1 rounded-full bg-blue-100/50 border border-blue-200 mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Alta Performance</span>
          </div>
          <h2 className="font-heading font-extrabold text-4xl md:text-5xl text-slate-900 mt-3 mb-6 tracking-tight">
            Ferramentas que <br />
            <span className="text-blue-600">impulsionam resultados</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Uma suíte completa de gestão e automação desenhada especificamente para escalas doações e otimizar o relacionamento com sua base.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative"
            >
              <div className="h-full bg-white/70 backdrop-blur-sm rounded-[2rem] border border-slate-200 p-8 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 group-hover:bg-white">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-heading font-bold text-slate-900 text-xl mb-3">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{feature.description}</p>
                
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  Saber mais
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
