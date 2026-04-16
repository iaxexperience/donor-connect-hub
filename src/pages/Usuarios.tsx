import { useState } from "react";
import { Plus, Search, Shield, User, Mail, UserPlus, Loader2, Key, Smartphone, FileText, Eye, EyeOff, Check, X, Edit2, RotateCcw, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProfiles } from "@/hooks/useProfiles";

const roleMapping: Record<string, { label: string, color: string }> = {
  "admin": { label: "Administrador", color: "destructive" },
  "gestor": { label: "Gestor de Campanha", color: "default" },
  "operador": { label: "Operador de Telemarketing", color: "secondary" },
  "visualizador": { label: "Visualizador", color: "outline" },
};

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
  <div className={`flex items-center gap-1.5 text-[10px] font-medium transition-colors ${met ? "text-emerald-500" : "text-muted-foreground"}`}>
    {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 opacity-50" />}
    <span>{text}</span>
  </div>
);

const Usuarios = () => {
  const { profiles, isLoading, createProfile, updateProfile } = useProfiles();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCPF, setNewCPF] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newRole, setNewRole] = useState<any>("");

  const passwordRules = {
    length: newPassword.length >= 8,
    number: /\d/.test(newPassword),
    upper: /[A-Z]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordRules).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && newPassword !== "";

  const handleOpenDialog = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setNewName(user.name);
      setNewEmail(user.email);
      setNewCPF(user.cpf || "");
      setNewPhone(user.phone || "");
      setNewRole(user.role);
    } else {
      setEditingUser(null);
      setNewName("");
      setNewEmail("");
      setNewCPF("");
      setNewPhone("");
      setNewRole("");
    }
    setNewPassword("");
    setConfirmPassword("");
    setIsDialogOpen(true);
  };

  const handleCreateUser = async () => {
    if (!newName || !newEmail || !newRole || (!editingUser && !newPassword)) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha os campos essenciais para cadastrar o usuário.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas divergentes",
        description: "A confirmação de senha não coincide com a senha digitada.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingUser) {
        await updateProfile({
          id: editingUser.id,
          name: newName,
          email: newEmail,
          cpf: newCPF,
          phone: newPhone,
          role: newRole,
        });
        toast({ title: "Usuário Atualizado!", description: `${newName} foi atualizado com sucesso.` });
      } else {
        // 1. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: newEmail,
          password: newPassword,
        });

        if (authError) throw authError;

        if (authData.user) {
          // 2. Create profile with the new Auth ID
          await createProfile({
            id: authData.user.id,
            name: newName,
            email: newEmail,
            cpf: newCPF,
            phone: newPhone,
            role: newRole,
            must_change_password: true,
            status: 'Pendente' // All new self-registers or admin-created users start as Pending
          });
          toast({ 
            title: "Usuário Cadastrado!", 
            description: `O perfil de ${newName} foi criado. Verifique se o e-mail de confirmação foi enviado.`,
          });
        }
      }

      setIsDialogOpen(false);
      setNewName("");
      setNewEmail("");
      setNewCPF("");
      setNewPhone("");
      setNewPassword("");
      setConfirmPassword("");
      setNewRole("");
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível sincronizar com o banco de dados.",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (user: any) => {
    try {
      await updateProfile({
        id: user.id,
        must_change_password: true
      });
      toast({
        title: "Senha Redefinida!",
        description: `O usuário ${user.name} será obrigado a trocar a senha no próximo acesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao redefinir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleActivateUser = async (user: any) => {
    try {
      await updateProfile({
        id: user.id,
        status: 'Ativo'
      });
      toast({
        title: "Usuário Ativado!",
        description: `O perfil de ${user.name} agora está ativo e pronto para uso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao ativar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredUsers = profiles.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Usuários</h1>
          <p className="text-muted-foreground text-sm">Gerencie os usuários e permissões do sistema.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button 
            onClick={() => handleOpenDialog()}
            className="bg-primary hover:bg-primary/90 shadow-glow transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingUser ? <Edit2 className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5 text-primary" />}
                {editingUser ? "Editar Usuário" : "Cadastrar Novo Usuário"}
              </DialogTitle>
              <DialogDescription>
                {editingUser ? "Altere as informações do usuário selecionado." : "Crie um novo perfil de acesso para a plataforma Donor Connect."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="name" 
                    placeholder="Ex: João Silva" 
                    className="pl-9"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="cpf" 
                      placeholder="000.000.000-00" 
                      className="pl-9"
                      value={newCPF}
                      onChange={(e) => setNewCPF(formatCPF(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      placeholder="(00) 00000-0000" 
                      className="pl-9"
                      value={newPhone}
                      onChange={(e) => setNewPhone(formatPhone(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="email@exemplo.com" 
                    className="pl-9"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{editingUser ? "Nova Senha (opcional)" : "Senha Temporária"}</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      className="pl-9 pr-9"
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
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 p-3 rounded-lg bg-muted/30 border border-muted">
                    <PasswordRequirement met={passwordRules.length} text="8+ caracteres" />
                    <PasswordRequirement met={passwordRules.number} text="Um número" />
                    <PasswordRequirement met={passwordRules.upper} text="Uma maiúscula" />
                    <PasswordRequirement met={passwordRules.special} text="Um símbolo (!@#)" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="confirmPassword" 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      className={`pl-9 transition-all duration-300 ${passwordsMatch ? "border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500" : ""}`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {passwordsMatch && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 animate-in fade-in zoom-in" />
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Papel / Nível de Acesso</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecione o papel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="gestor">Gestor de Campanha</SelectItem>
                    <SelectItem value="operador">Operador de Telemarketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateUser}>{editingUser ? "Salvar Alterações" : "Salvar Usuário"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar usuário..." 
          className="pl-9" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden shadow-soft">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último Acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span>Carregando usuários...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const roleData = roleMapping[user.role] || { label: user.role, color: "outline" };
                return (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-foreground/90">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleData.color as any} className="font-medium">
                        {roleData.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.status === "Ativo" ? "default" : user.status === "Pendente" ? "secondary" : "outline"} 
                        className={`px-2 py-0 h-5 ${user.status === "Pendente" ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200" : ""}`}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {user.last_access ? new Date(user.last_access).toLocaleDateString("pt-BR") : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handleOpenDialog(user)}
                          title="Editar Usuário"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        
                        {user.status === 'Pendente' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 shadow-sm border border-emerald-100 animate-pulse"
                            onClick={() => handleActivateUser(user)}
                            title="Ativar Usuário"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-8 w-8 ${user.must_change_password ? "text-amber-500 bg-amber-50" : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"}`}
                          onClick={() => handleResetPassword(user)}
                          title="Forçar troca de senha"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Usuarios;
