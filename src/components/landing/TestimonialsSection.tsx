import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Maria Santos",
    role: "Diretora de Captação — ONG Esperança Viva",
    text: "Aumentamos nossas doações recorrentes em 45% nos primeiros 3 meses. A automação via WhatsApp é um divisor de águas.",
    rating: 5,
  },
  {
    name: "Carlos Oliveira",
    role: "Gestor de Campanhas — Instituto Futuro",
    text: "O Kanban e o dashboard nos deram clareza total sobre nosso pipeline de doadores. Decisões muito mais rápidas e assertivas.",
    rating: 5,
  },
  {
    name: "Ana Ferreira",
    role: "Coordenadora — Fundação Cuidar",
    text: "A personalização com IA tornou nossas mensagens muito mais humanas. Os doadores sentem que a comunicação é genuína.",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">Depoimentos</span>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-3 mb-4">
            Organizações que já transformaram sua arrecadação
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl border border-border p-6 shadow-soft"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-foreground mb-6 leading-relaxed">"{t.text}"</p>
              <div>
                <p className="font-heading font-semibold text-foreground text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
