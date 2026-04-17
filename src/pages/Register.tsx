import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import PulseLogo from "@/components/common/PulseLogo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const roles = [
  { value: "operador", label: "Operador de Telemarketing" },
  { value: "gestor", label: "Gestor de Campanha" },
  { value: "visualizador", label: "Visualizador" },
];

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "+55 ";
  
  let numbers = digits;
  if (!digits.startsWith("55")) {
    numbers = "55" + digits;
  }
  
  numbers = numbers.slice(0, 13);
  
  const country = numbers.slice(0, 2);
  const ddd = numbers.slice(2, 4);
  const firstPart = numbers.slice(4, 9);
  const lastPart = numbers.slice(9);
  
  if (numbers.length <= 2) return `+${country}`;
  if (numbers.length <= 4) return `+${country} (${ddd}`;
  if (numbers.length <= 9) return `+${country} (${ddd}) ${firstPart}`;
  return `+${country} (${ddd}) ${firstPart}-${lastPart}`;
};

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+55 ");
  const [cpf, setCpf] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }

    if (cpf.replace(/\D/g, "").length !== 11) {
      toast({ title: "CPF inválido", variant: "destructive" });
      return;
    }

    if (!role) {
      toast({ title: "Selecione um papel", variant: "destructive" });
      return;
    }

    setLoading(true);
    
    try {
      // 1. Sign up user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create the associated profile with 'Pendente' status
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: authData.user.id,
            name,
            email,
            cpf,
            phone,
            role,
            status: 'Pendente',
            must_change_password: false, // For self-registration we assume they set their password
          }
        ]);

        if (profileError) throw profileError;

        toast({
          title: "Cadastro solicitado!",
          description: "Sua conta foi criada, mas aguarda a ativação por um administrador.",
        });
        
        // Clear form or redirect
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative items-center justify-center p-12">
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-primary-foreground/5 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center max-w-md flex flex-col items-center"
        >
          <div className="mb-8">
            <PulseLogo variant="light" size={80} showText className="scale-125" />
          </div>
          <p className="text-primary-foreground/70 leading-relaxed text-lg">
            Crie sua conta e comece a transformar a gestão de doadores da sua organização.
          </p>
        </motion.div>
      </div>

      {/* Right side — register form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao site
          </Link>

          <div className="lg:hidden mb-6">
            <PulseLogo variant="dark" size={40} showText />
          </div>

          <h1 className="font-heading font-bold text-2xl text-foreground mb-1">
            Criar conta
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Preencha os dados abaixo para se cadastrar na plataforma.
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Nome completo
              </label>
              <Input
                placeholder="João da Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                E-mail
              </label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  CPF
                </label>
                <Input
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  required
                  maxLength={14}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Telefone
                </label>
                <Input
                  placeholder="+55 (00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  required
                  maxLength={20}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Papel na organização
              </label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um papel" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Senha
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Confirmar senha
              </label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Cadastrando..." : "Criar conta"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Entrar
            </Link>
          </p>

          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-center gap-2">
            <p className="text-[10px] text-slate-400 font-medium tracking-tight">
              © 2026 FAP — Todos os direitos reservados
            </p>
            <p className="text-[9px] text-slate-300 uppercase tracking-[0.2em] font-bold text-center">
              Desenvolvido por IAX — Inteligência Artificial Experience
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
