import PulseLogo from "@/components/common/PulseLogo";

const FooterSection = () => {
  return (
    <footer className="bg-[#001A3D] py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="hover:scale-105 transition-transform duration-300 cursor-pointer">
            <PulseLogo showText size={40} variant="light" />
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-2">
            <p className="text-sm text-white/40 font-medium tracking-tight">
              © 2026 FAP — Todos os direitos reservados
            </p>
            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">
              Desenvolvido por IAX — Inteligência Artificial Experience
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
