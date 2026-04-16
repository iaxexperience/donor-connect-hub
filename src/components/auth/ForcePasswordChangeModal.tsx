import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Check, X, Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
  <div className={`flex items-center gap-1.5 text-[10px] font-medium transition-colors ${met ? "text-emerald-500" : "text-muted-foreground"}`}>
    {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 opacity-50" />}
    <span>{text}</span>
  </div>
);

export const ForcePasswordChangeModal = () => {
  const { mustChangePassword, updateMustChangePassword, user } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const passwordRules = {
    length: newPassword.length >= 8,
    number: /\d/.test(newPassword),
    upper: /[A-Z]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordRules).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && newPassword !== "";

  const handleUpdatePassword = async () => {
    if (!isPasswordValid) {
      toast({ title: "Senha fraca", description: "Sua senha deve obedecer a todas as regras de segurança.", variant: "destructive" });
      return;
    }

    if (!passwordsMatch) {
      toast({ title: "Senhas divergentes", description: "A confirmação não coincide com a nova senha.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      
      // 1. Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) throw authError;

      // 2. Update must_change_password flag in profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', user?.id);
      
      if (profileError) throw profileError;

      toast({ title: "Senha atualizada!", description: "Sua nova senha foi salva com sucesso. Bem-vindo!" });
      updateMustChangePassword(false);
    } catch (error: any) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={mustChangePassword}>
      <DialogContent className="sm:max-w-[425px] [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Troca de Senha Obrigatória</DialogTitle>
          <DialogDescription>
            Para garantir a segurança da sua conta, você deve escolher uma nova senha em seu primeiro acesso.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova Senha</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                id="new-password" 
                type={showPassword ? "text" : "password"}
                placeholder="••••••••" 
                className="pl-9 pr-9 h-11"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <PasswordRequirement met={passwordRules.length} text="8+ caracteres" />
              <PasswordRequirement met={passwordRules.number} text="Um número" />
              <PasswordRequirement met={passwordRules.upper} text="Uma maiúscula" />
              <PasswordRequirement met={passwordRules.special} text="Um símbolo" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                id="confirm-password" 
                type={showPassword ? "text" : "password"}
                placeholder="••••••••" 
                className={`pl-9 h-11 transition-all duration-300 ${passwordsMatch ? "border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500" : ""}`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {passwordsMatch && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 animate-in fade-in zoom-in" />
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button 
            className="w-full h-11 font-bold text-base" 
            disabled={!isPasswordValid || !passwordsMatch || loading}
            onClick={handleUpdatePassword}
          >
            {loading ? "Salvando..." : "Atualizar e Acessar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
