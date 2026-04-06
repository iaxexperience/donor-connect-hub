import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 bg-gradient-hero relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-primary-foreground mb-4">
            Pronto para transformar sua arrecadação?
          </h2>
          <p className="text-primary-foreground/70 max-w-xl mx-auto mb-8">
            Comece hoje mesmo e veja seus resultados crescerem com automação inteligente e gestão centralizada.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl">
              Começar Agora
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="heroOutline" size="xl">
              Falar com Especialista
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
