import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, ArrowLeft, Mail, Lock, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import PulseLogo from "@/components/common/PulseLogo";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({
        title: "Informe seu e-mail",
        description: "Digite seu e-mail no campo acima antes de solicitar a recuperação.",
        variant: "destructive",
      });
      return;
    }

    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) throw error;

      toast({
        title: "E-mail de recuperação enviado",
        description: "Verifique sua caixa de entrada (e o spam) para redefinir sua senha.",
      });
    } catch (error: any) {
      toast({
        title: "Não foi possível enviar o e-mail",
        description: error.message || "Tente novamente em alguns minutos ou contate o administrador.",
        variant: "destructive",
      });
    } finally {
      setSendingReset(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let description = "E-mail ou senha incorretos. Verifique suas credenciais.";
        
        if (error.message.includes("Email not confirmed")) {
          description = "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou desative a confirmação no Supabase.";
        } else if (error.message.includes("is prohibited")) {
          description = "Este usuário foi bloqueado ou as credenciais estão inválidas.";
        }

        toast({
          title: "Erro no acesso",
          description: description,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (data.session) {
        // Check profile status before navigating
        const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (profile?.status === 'Pendente') {
          await supabase.auth.signOut();
          toast({
            title: "Acesso pendente",
            description: "Sua conta ainda aguarda aprovação de um administrador.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (profile?.status === 'Inativo') {
          await supabase.auth.signOut();
          toast({
            title: "Conta inativa",
            description: "Sua conta está inativa. Entre em contato com o administrador.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        toast({
          title: "Bem-vindo!",
          description: "Acesso autorizado com sucesso.",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Erro inesperado",
        description: "Não foi possível conectar ao servidor de segurança.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_80%_15%,rgba(14,116,190,.45),transparent_40%),linear-gradient(135deg,#041330_0%,#061b3b_45%,#0a2a55_100%)] text-white">
      {/* grade sutil, como na landing */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[.06] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:64px_64px]"
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6">
        <div className="flex justify-end">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-bold text-white/90 backdrop-blur hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para o site
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] shadow-[0_30px_90px_rgba(0,0,0,.45)] lg:grid-cols-2"
          >
            {/* ── Formulário ─────────────────────────────── */}
            <div className="bg-white px-6 py-10 text-[#061b3b] sm:px-12 sm:py-14">
              <div className="flex justify-center">
                <PulseLogo variant="dark" size={46} showText />
              </div>

              <h1 className="mt-10 text-center text-3xl font-black tracking-[-.03em]">Acesse sua conta</h1>

              <form onSubmit={handleLogin} className="mt-8 space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">E-mail</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="email@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={255}
                      autoComplete="email"
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Senha</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="current-password"
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 pr-11 text-base"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-full bg-[#0b5ccf] text-base font-black shadow-[0_12px_30px_rgba(11,92,207,.35)] hover:bg-[#0a52b9]"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={sendingReset}
                  className="text-sm font-bold text-[#0b5ccf] hover:underline disabled:opacity-50"
                >
                  {sendingReset ? "Enviando..." : "Esqueceu sua senha?"}
                </button>
              </div>

              <p className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
                Não tem conta?{" "}
                <Link to="/cadastro" className="font-black text-[#0b5ccf] hover:underline">
                  Criar conta
                </Link>
              </p>
            </div>

            {/* ── Painel com foto ────────────────────────── */}
            <div className="relative hidden min-h-[560px] lg:block">
              <img
                src="/landing/cuidado-maos.jpg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover grayscale-[35%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#061b3b] via-[#061b3b]/75 to-[#061b3b]/20" />
              <div className="absolute inset-x-0 bottom-0 p-12">
                <p className="text-xs font-black uppercase tracking-[.28em] text-sky-300">
                  Gestão de doações filantrópicas
                </p>
                <h2 className="mt-4 text-4xl font-black tracking-[-.03em]">Que bom ter você aqui!</h2>
                <p className="mt-4 leading-7 text-slate-200">
                  Do telefonema ao recibo: doadores, captação, caixa e coleta num lugar só.
                </p>
                <ul className="mt-6 space-y-3">
                  {["Carteira de doadores e telemarketing", "Recibos numerados com QR code", "Metas, relatórios e coleta"].map((item) => (
                    <li key={item} className="flex items-center gap-3 font-semibold">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#0b5ccf]">
                        <Check className="h-4 w-4" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>

        <footer className="flex flex-col items-center justify-between gap-3 text-center text-xs text-white/60 sm:flex-row sm:text-left">
          <p>Pulse Doações © {new Date().getFullYear()} — Produzido por IAX Inteligência Artificial Experience LTDA. Todos os direitos reservados.</p>
          <p className="text-white/40">Atualização 1.0</p>
        </footer>
      </div>
    </div>
  );
};

export default Login;
