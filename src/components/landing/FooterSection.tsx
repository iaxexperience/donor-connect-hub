import { Heart } from "lucide-react";

const FooterSection = () => {
  return (
    <footer className="bg-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
              <Heart className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="font-heading font-bold text-lg text-background">FAP Pulse</span>
          </div>
          <p className="text-sm text-background/50">
            © {new Date().getFullYear()} FAP Pulse. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
