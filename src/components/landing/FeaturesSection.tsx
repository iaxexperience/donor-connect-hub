import { motion } from "framer-motion";
import {
  Users, MessageCircle, BarChart3, Kanban,
  Brain, Webhook, Shield, Zap,
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
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">Funcionalidades</span>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-3 mb-4">
            Tudo que você precisa para{" "}
            <span className="text-gradient-primary">maximizar doações</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Uma plataforma completa que centraliza informações, automatiza processos e fornece insights para sua organização.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group bg-card rounded-xl border border-border p-6 hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
