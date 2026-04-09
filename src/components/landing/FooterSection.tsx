import { Heart } from "lucide-react";
import logoFap from "@/assets/logo-fap.png";

const FooterSection = () => {
  return (
    <footer className="bg-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={logoFap} alt="FAP Pulse" className="h-8 w-auto brightness-0 invert" />
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
