import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const ContactSection = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name');
    const email = formData.get('email');
    const org = formData.get('org');
    const message = formData.get('message');

    setLoading(true);
    
    // Construct mailto link
    const subject = encodeURIComponent(`Contato de ${name} - ${org}`);
    const body = encodeURIComponent(`Nome: ${name}\nE-mail: ${email}\nOrganização: ${org}\n\nMensagem:\n${message}`);
    
    setTimeout(() => {
      setLoading(false);
      window.location.href = `mailto:comercial@iax.info?subject=${subject}&body=${body}`;
      toast({ 
        title: "Abrindo seu e-mail...", 
        description: "Enviando mensagem para comercial@iax.info" 
      });
      (e.target as HTMLFormElement).reset();
    }, 500);
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
                  href: "https://wa.me/5583996583281"
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
