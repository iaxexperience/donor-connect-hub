import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users, MessageSquare, BarChart3, Kanban as KanbanIcon,
  Megaphone, Phone, Bell, Banknote, Gift,
  Link as LinkIcon, UserCog, Globe, Settings, LayoutDashboard,
  ShieldCheck, ArrowRight
} from "lucide-react";

const featureCategories = [
  {
    category: "Gestão Central",
    features: [
      {
        icon: LayoutDashboard,
        title: "🏠 Dashboard",
        description: "Visão geral em tempo real: recebimentos, saldo ASAAS/BB, Pulso da Arrecadação (Health Score) e mix por campanha."
      },
      {
        icon: Users,
        title: "👥 Doadores",
        description: "Cadastro completo, classificação (Lead a Recorrente), importação CSV automática e histórico 360°."
      },
      {
        icon: KanbanIcon,
        title: "📋 Kanban",
        description: "Pipeline visual de conversão de leads em doadores ativos com gestão simplificada do funil."
      }
    ]
  },
  {
    category: "Operacional & Captação",
    features: [
      {
        icon: Megaphone,
        title: "📣 Campanhas",
        description: "Criação de metas, acompanhamento em tempo real e vinculação direta de doações."
      },
      {
        icon: Phone,
        title: "📞 Telemarketing",
        description: "Fila de contatos inteligente e registro de resultados para captação ativa."
      },
      {
        icon: Bell,
        title: "🔔 Follow-ups",
        description: "Agendamento automático via cron job com status e notas personalizadas por doador."
      }
    ]
  },
  {
    category: "Comunicação & Financeiro",
    features: [
      {
        icon: MessageSquare,
        title: "💬 WhatsApp",
        description: "Integração Meta API, envio de templates, chat em tempo real e proxy Meta Business."
      },
      {
        icon: Banknote,
        title: "💰 Caixa",
        description: "Controle físico diário, emissão de recibos sequenciais (DOA-YYYY-N) e validação pública."
      },
      {
        icon: Gift,
        title: "🎁 Doações Físicas",
        description: "Registro de itens não-financeiros (alimentos, veículos, etc.) com controle de status e destino."
      }
    ]
  },
  {
    category: "Inteligência & Tecnologia",
    features: [
      {
        icon: BarChart3,
        title: "📊 Relatórios",
        description: "Análise profunda por campanha, método de pagamento e evolução de arrecadação."
      },
      {
        icon: LinkIcon,
        title: "🔗 Integrações",
        description: "Conexão nativa com ASAAS (Webhooks), Banco do Brasil (mTLS) e Meta WhatsApp."
      },
      {
        icon: Globe,
        title: "🌐 API Aberta",
        description: "API RESTful documentada com Webhooks em tempo real e limite de 10.000 req/hora."
      }
    ]
  }
];

const FeaturesSection = () => {
  const navigate = useNavigate();
  return (
    <section id="features" className="py-24 bg-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00C38B] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#001A3D] rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#00C38B]/10 border border-[#00C38B]/20 mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#001A3D]">Ecossistema Completo</span>
          </div>
          <h2 className="font-heading font-extrabold text-4xl md:text-5xl text-[#001A3D] mt-3 mb-6 tracking-tight">
            Tudo o que você precisa <br />
            <span className="text-[#00C38B]">em um só lugar</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Combinamos captação, relacionamento, controle financeiro e automações para transformar sua gestão do terceiro setor.
          </p>
        </motion.div>

        <div className="space-y-20">
          {featureCategories.map((cat, catIdx) => (
            <div key={cat.category} className="space-y-10">
              <div className="flex items-center gap-4">
                <h3 className="font-heading font-black text-xs uppercase tracking-[0.4em] text-slate-400 shrink-0">
                  {cat.category}
                </h3>
                <div className="h-[1px] w-full bg-slate-100" />
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {cat.features.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group"
                  >
                    <div className="h-full bg-slate-50/50 hover:bg-white rounded-[2rem] border border-slate-100 p-8 hover:shadow-2xl hover:shadow-[#00C38B]/10 transition-all duration-500 hover:-translate-y-2">
                      <div className="w-14 h-14 rounded-2xl bg-[#001A3D] flex items-center justify-center mb-6 shadow-lg shadow-[#001A3D]/10 group-hover:bg-[#00C38B] transition-colors duration-500">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-heading font-bold text-[#001A3D] text-lg mb-3 tracking-tight">{feature.title}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Global Settings / Users summary footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-20 p-8 rounded-[2.5rem] bg-[#001A3D] text-white flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-[#00C38B]" />
            </div>
            <div>
              <h4 className="font-bold text-xl mb-1">Gestão de Usuários e Configurações</h4>
              <p className="text-white/60 text-sm max-w-md">Controle de acessos, White Label completo e gerenciamento de chaves de API em um painel seguro.</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/documentacao")}
            className="px-8 h-12 bg-[#00C38B] text-[#001A3D] font-bold rounded-xl hover:scale-105 transition-transform active:scale-95"
          >
            Ver Documentação API
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
