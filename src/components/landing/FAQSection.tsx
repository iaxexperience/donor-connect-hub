import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Preciso ter conta WhatsApp Business API?",
    a: "Sim, é necessário ter uma conta verificada na API WhatsApp Business da Meta. Nosso time pode auxiliar no processo de configuração.",
  },
  {
    q: "Como funciona a classificação automática de doadores?",
    a: "O sistema classifica automaticamente: 1 doação = Único; 2+ doações em 6 meses = Esporádico; 3+ doações em 3 meses = Recorrente. Você também pode mover manualmente no Kanban.",
  },
  {
    q: "Quais LLMs são suportados?",
    a: "Suportamos OpenAI (GPT-4), Google Gemini, Anthropic Claude e outros modelos compatíveis. Você configura a API Key e os parâmetros diretamente na plataforma.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Absolutamente. Utilizamos criptografia HTTPS/TLS, RBAC, Row Level Security no banco de dados, e estamos em conformidade com a LGPD.",
  },
  {
    q: "Posso importar minha base de doadores existente?",
    a: "Sim! Você pode importar doadores via arquivo CSV ou Excel. O sistema valida CPF, telefone e e-mail automaticamente.",
  },
  {
    q: "É possível integrar com N8N ou outras ferramentas?",
    a: "Sim, temos uma tela dedicada para configuração de webhooks. Você pode conectar N8N, GPT Maker, APIs bancárias e gateways de pagamento.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-24 bg-gradient-warm">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">FAQ</span>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-3">
            Perguntas Frequentes
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-card rounded-xl border border-border px-6 shadow-soft"
              >
                <AccordionTrigger className="font-heading font-semibold text-foreground text-left py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
