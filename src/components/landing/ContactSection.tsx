import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ContactSection = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const org = formData.get('org') as string;
    const message = formData.get('message') as string;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: { name, email, org, message },
      });

      if (error) throw error;

      toast({
        title: "Mensagem enviada!",
        description: "Entraremos em contato em breve.",
      });
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast({
        title: "Erro ao enviar",
        description: err?.message || "Tente novamente ou envie para comercial@iax.info",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-sm font-semibold text-accent uppercase tracking-wider">Contato</span>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-3 mb-4">
              Fale com nosso time
            </h2>
            <p className="text-muted-foreground mb-8">
              Quer saber como a FAP Pulse pode ajudar sua organização? Entre em contato para uma demonstração personalizada.
            </p>

            <div className="space-y-4">
              {[
                { 
                  icon: Mail, 
                  label: "comercial@iax.info",
                  href: "mailto:comercial@iax.info"
                },
                { 
                  icon: Phone, 
                  label: "83 996583281",
                  href: "https://web.whatsapp.com/send?phone=5583996583281&text=Ol%C3%A1!%20Gostaria%20de%20falar%20com%20a%20equipe%20do%20Pulse%20Doa%C3%A7%C3%B5es."
                },
                { 
                  icon: MapPin, 
                  label: "Campina Grande - PB",
                  href: "https://maps.google.com/?q=Campina+Grande+-+PB"
                },
              ].map((item) => (
                <a 
                  key={item.label} 
                  href={item.href}
                  target={item.href.startsWith('http') ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 hover:text-primary transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                    <item.icon className="w-5 h-5 text-primary group-hover:text-white" />
                  </div>
                  <span className="text-foreground text-sm font-medium">{item.label}</span>
                </a>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 shadow-soft space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nome</label>
                  <Input name="name" placeholder="Seu nome" required maxLength={100} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">E-mail</label>
                  <Input name="email" type="email" placeholder="seu@email.com" required maxLength={255} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Organização</label>
                <Input name="org" placeholder="Nome da sua organização" maxLength={200} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Mensagem</label>
                <Textarea name="message" placeholder="Como podemos ajudar?" rows={4} required maxLength={1000} />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Mensagem"}
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
