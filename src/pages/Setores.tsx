import { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  User,
  Mail,
  Phone,
  Hash,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Shield,
  Layers,
  Sparkles,
  Users,
  Briefcase,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { setorService, Setor } from "@/services/setorService";

export default function Setores() {
  const { toast } = useToast();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSetor, setEditingSetor] = useState<Setor | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [coordenadorId, setCoordenadorId] = useState<string>("none");
  const [coordenadorNome, setCoordenadorNome] = useState("");
  const [coordenadorEmail, setCoordenadorEmail] = useState("");
  const [coordenadorTelefone, setCoordenadorTelefone] = useState("");
  const [ramal, setRamal] = useState("");
  const [cor, setCor] = useState("#0284c7");
  const [status, setStatus] = useState<"ativo" | "inativo">("ativo");

  // Load Setores and Profiles
  const loadData = async () => {
    setLoading(true);
    try {
      const [setoresList, profsRes] = await Promise.all([
        setorService.getSetores(),
        supabase.from("profiles").select("id, name, email, role, phone"),
      ]);
      setSetores(setoresList);
      if (profsRes.data) setProfiles(profsRes.data);
    } catch (err: any) {
      console.error("Erro ao carregar setores:", err);
      toast({
        title: "Erro ao carregar setores",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewDialog = () => {
    setEditingSetor(null);
    setNome("");
    setDescricao("");
    setCoordenadorId("none");
    setCoordenadorNome("");
    setCoordenadorEmail("");
    setCoordenadorTelefone("");
    setRamal("");
    setCor("#0284c7");
    setStatus("ativo");
    setDialogOpen(true);
  };

  const openEditDialog = (setor: Setor) => {
    setEditingSetor(setor);
    setNome(setor.nome);
    setDescricao(setor.descricao || "");
    setCoordenadorId(setor.coordenador_id || "none");
    setCoordenadorNome(setor.coordenador_nome);
    setCoordenadorEmail(setor.coordenador_email || "");
    setCoordenadorTelefone(setor.coordenador_telefone || "");
    setRamal(setor.ramal || "");
    setCor(setor.cor || "#0284c7");
    setStatus(setor.status);
    setDialogOpen(true);
  };

  const handleSelectCoordinator = (val: string) => {
    setCoordenadorId(val);
    if (val === "none") {
      return;
    }
    const prof = profiles.find((p) => p.id === val);
    if (prof) {
      setCoordenadorNome(prof.name);
      if (prof.email) setCoordenadorEmail(prof.email);
      if (prof.phone) setCoordenadorTelefone(prof.phone);
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ title: "Informe o nome do setor", variant: "destructive" });
      return;
    }
    if (!coordenadorNome.trim()) {
      toast({ title: "Informe o nome do coordenador responsável", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        coordenador_id: coordenadorId === "none" ? null : coordenadorId,
        coordenador_nome: coordenadorNome.trim(),
        coordenador_email: coordenadorEmail.trim() || undefined,
        coordenador_telefone: coordenadorTelefone.trim() || undefined,
        ramal: ramal.trim() || undefined,
        cor,
        status,
      };

      if (editingSetor) {
        await setorService.updateSetor(editingSetor.id, payload);
        toast({ title: "Setor atualizado com sucesso!" });
      } else {
        await setorService.createSetor(payload);
        toast({ title: "Novo setor cadastrado com sucesso!" });
      }

      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      console.error("Erro ao salvar setor:", err);
      toast({
        title: "Erro ao salvar setor",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (setor: Setor) => {
    if (!confirm(`Deseja realmente remover o setor "${setor.nome}"?`)) return;
    try {
      await setorService.deleteSetor(setor.id);
      toast({ title: "Setor removido com sucesso" });
      await loadData();
    } catch (err: any) {
      toast({ title: "Erro ao remover setor", description: err.message, variant: "destructive" });
    }
  };

  const filteredSetores = useMemo(() => {
    return setores.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = s.nome.toLowerCase().includes(term);
        const matchesCoord = s.coordenador_nome.toLowerCase().includes(term);
        const matchesRamal = s.ramal?.includes(term);
        if (!matchesName && !matchesCoord && !matchesRamal) return false;
      }
      return true;
    });
  }, [setores, statusFilter, searchTerm]);

  const stats = [
    { label: "Total de Setores", value: setores.length, icon: Building2, color: "text-primary" },
    { label: "Setores Ativos", value: setores.filter((s) => s.status === "ativo").length, icon: CheckCircle2, color: "text-green-600" },
    { label: "Coordenadores", value: new Set(setores.map((s) => s.coordenador_nome)).size, icon: User, color: "text-blue-600" },
    { label: "Ramais Ativos", value: setores.filter((s) => s.ramal).length, icon: Phone, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-primary" />
            Setores da Empresa
          </h1>
          <p className="text-muted-foreground text-sm">
            Cadastre os departamentos da empresa e defina o coordenador responsável por cada área.
          </p>
        </div>
        <Button onClick={openNewDialog} className="shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Novo Setor
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`p-2.5 rounded-xl bg-muted ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por setor, coordenador ou ramal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid de Cards de Setores */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground">
          <Building2 className="w-8 h-8 animate-pulse mx-auto mb-2 text-primary" />
          Carregando setores da empresa...
        </div>
      ) : filteredSetores.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">Nenhum setor encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            {searchTerm ? "Tente ajustar os filtros de pesquisa." : "Cadastre o primeiro setor clicando no botão acima."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSetores.map((setor) => (
            <Card
              key={setor.id}
              className="relative overflow-hidden transition-all hover:shadow-md border-slate-200"
            >
              {/* Barra lateral de cor */}
              <div
                className="absolute top-0 left-0 bottom-0 w-1.5"
                style={{ backgroundColor: setor.cor || "#0284c7" }}
              />

              <CardHeader className="pl-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold text-slate-900 leading-tight">
                      {setor.nome}
                    </CardTitle>
                    {setor.ramal && (
                      <span className="inline-flex items-center text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Hash className="w-3 h-3 mr-0.5 text-slate-400" /> Ramal: {setor.ramal}
                      </span>
                    )}
                  </div>
                  <Badge
                    variant={setor.status === "ativo" ? "default" : "secondary"}
                    className={
                      setor.status === "ativo"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : "bg-slate-100 text-slate-600"
                    }
                  >
                    {setor.status === "ativo" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                {setor.descricao && (
                  <CardDescription className="text-xs text-slate-600 line-clamp-2 mt-1">
                    {setor.descricao}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="pl-5 pt-0 space-y-3">
                {/* Bloco do Coordenador Responsável */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-primary" /> Coordenador Responsável
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-white text-primary border-primary/20">
                      Gestor da Área
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {setor.coordenador_nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {setor.coordenador_nome}
                      </p>
                      {setor.coordenador_email && (
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {setor.coordenador_email}
                        </p>
                      )}
                    </div>
                  </div>

                  {setor.coordenador_telefone && (
                    <div className="pt-1.5 border-t border-slate-200/60 flex items-center gap-1.5 text-xs text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{setor.coordenador_telefone}</span>
                    </div>
                  )}
                </div>

                {/* Ações do Card */}
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-slate-600 hover:text-primary"
                    onClick={() => openEditDialog(setor)}
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(setor)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição de Setor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-primary" />
              {editingSetor ? "Editar Setor" : "Cadastrar Novo Setor"}
            </DialogTitle>
            <DialogDescription>
              Defina os detalhes do setor e informe o coordenador responsável pela gestão da área.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nome do Setor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome do Setor *</Label>
              <Input
                placeholder="Ex: Telemarketing, Captação de Recursos, Financeiro..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="bg-white"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição das Atividades (opcional)</Label>
              <Textarea
                placeholder="Descreva as principais funções e responsabilidades deste setor..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
                className="bg-white"
              />
            </div>

            {/* Bloco Coordenador Responsável */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Coordenador / Responsável pelo Setor *
                </Label>
              </div>

              {/* Vincular usuário existente */}
              {profiles.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Vincular a um usuário do sistema (opcional)
                  </Label>
                  <Select value={coordenadorId} onValueChange={handleSelectCoordinator}>
                    <SelectTrigger className="bg-white h-9 text-xs">
                      <SelectValue placeholder="Selecione um usuário para preencher dados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Preenchimento manual / Outro</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Nome do Coordenador *</Label>
                <Input
                  placeholder="Nome completo do coordenador"
                  value={coordenadorNome}
                  onChange={(e) => setCoordenadorNome(e.target.value)}
                  className="bg-white h-9"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs">E-mail de Contato</Label>
                  <Input
                    type="email"
                    placeholder="email@hospitaldafap.org.br"
                    value={coordenadorEmail}
                    onChange={(e) => setCoordenadorEmail(e.target.value)}
                    className="bg-white h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Telefone / WhatsApp</Label>
                  <Input
                    placeholder="(83) 99999-9999"
                    value={coordenadorTelefone}
                    onChange={(e) => setCoordenadorTelefone(e.target.value)}
                    className="bg-white h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Ramal, Cor e Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ramal Interno</Label>
                <Input
                  placeholder="Ex: 101, 204..."
                  value={ramal}
                  onChange={(e) => setRamal(e.target.value)}
                  className="bg-white h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Cor de Identificação</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    className="w-9 h-9 p-0.5 rounded-lg border cursor-pointer bg-white"
                  />
                  <Input
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    className="bg-white h-9 font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(val: "ativo" | "inativo") => setStatus(val)}>
                  <SelectTrigger className="bg-white h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingSetor ? "Salvar Alterações" : "Cadastrar Setor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
