import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDonors } from "@/hooks/useDonors";
import { DonorType, typeLabel } from "@/lib/donationService";
import { ArrowLeft, User, Phone, MapPin, CheckCircle2, Loader2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DonorForm = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const { registerNewDonor, updateDonor, donors, isRegistering } = useDonors();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    type: "lead" as DonorType,
    cpf_cnpj: "",
    birth_date: "",
    zip_code: "",
    address: "",
    address_number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: ""
  });

  const [loadingCep, setLoadingCep] = useState(false);

  useEffect(() => {
    if (isEditMode && donors.length > 0) {
      const donor = donors.find(d => d.id === parseInt(id));
      if (donor) {
        setFormData({
          name: donor.name,
          email: donor.email,
          phone: donor.phone,
          type: donor.type,
          cpf_cnpj: donor.document_id || "",
          birth_date: donor.birth_date || "",
          zip_code: donor.zip_code || "",
          address: donor.address || "",
          address_number: donor.address_number || "",
          complement: donor.complement || "",
          neighborhood: donor.neighborhood || "",
          city: donor.city || "",
          state: donor.state || ""
        });
      }
    }
  }, [isEditMode, id, donors]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    }
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const formatCEP = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    return digits.replace(/(\d{5})(\d)/, "$1-$2");
  };

  const handleCepBlur = async () => {
    const cep = formData.zip_code.replace(/\D/g, "");
    if (cep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            address: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "Campos Obrigatórios",
        description: "Preencha Nome, E-mail e Telefone.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isEditMode) {
        await updateDonor(parseInt(id), formData);
        toast({
          title: "Sucesso!",
          description: "Doador atualizado com sucesso.",
        });
      } else {
        await registerNewDonor(formData as any);
        toast({
          title: "Sucesso!",
          description: "Doador cadastrado com sucesso.",
        });
      }
      
      navigate("/dashboard/doadores");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao Salvar",
        description: error.message || "Ocorreu um erro ao salvar o doador no banco de dados.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">
            {isEditMode ? "Editar Doador" : "Novo Doador"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEditMode 
              ? "Atualize as informações do doador no sistema." 
              : "Preencha os dados para registrar um novo doador no sistema."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Dados Básicos */}
        <Card className="border-muted/40 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <CardTitle className="text-lg">Informações Pessoais</CardTitle>
            </div>
            <CardDescription>Dados de identificação e classificação.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: João Silva" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Classificação *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v: DonorType) => setFormData({...formData, type: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabel).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF / CNPJ</Label>
                <Input 
                  id="cpf" 
                  placeholder="000.000.000-00" 
                  value={formData.cpf_cnpj} 
                  onChange={(e) => setFormData({...formData, cpf_cnpj: formatCPF(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input 
                  id="birth_date" 
                  type="date" 
                  value={formData.birth_date} 
                  onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card className="border-muted/40 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <CardTitle className="text-lg">Contato</CardTitle>
            </div>
            <CardDescription>Como entraremos em contato com o doador.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="email@exemplo.com" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp *</Label>
              <Input 
                id="phone" 
                placeholder="(00) 00000-0000" 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: formatPhone(e.target.value)})}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card className="border-muted/40 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <CardTitle className="text-lg">Endereço</CardTitle>
            </div>
            <CardDescription>Informações de localização.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zip_code">CEP</Label>
                <div className="relative">
                  <Input 
                    id="zip_code" 
                    placeholder="00000-000" 
                    value={formData.zip_code} 
                    onChange={(e) => setFormData({...formData, zip_code: formatCEP(e.target.value)})}
                    onBlur={handleCepBlur}
                    maxLength={9}
                  />
                  {loadingCep && (
                    <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="address">Logradouro</Label>
                <Input 
                  id="address" 
                  placeholder="Rua, Avenida, etc." 
                  value={formData.address} 
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="number">Número</Label>
                <Input 
                  id="number" 
                  placeholder="123" 
                  value={formData.address_number} 
                  onChange={(e) => setFormData({...formData, address_number: e.target.value})}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input 
                  id="complement" 
                  placeholder="Apto, Sala, Bloco..." 
                  value={formData.complement} 
                  onChange={(e) => setFormData({...formData, complement: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input 
                  id="neighborhood" 
                  placeholder="Centro" 
                  value={formData.neighborhood} 
                  onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input 
                  id="city" 
                  placeholder="São Paulo" 
                  value={formData.city} 
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado (UF)</Label>
                <Input 
                  id="state" 
                  placeholder="SP" 
                  maxLength={2}
                  value={formData.state} 
                  onChange={(e) => setFormData({...formData, state: e.target.value.toUpperCase()})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-6">
          <Button 
            variant="outline" 
            type="button" 
            onClick={() => navigate(-1)}
            disabled={isRegistering}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            size="lg" 
            className="px-8 shadow-glow"
            disabled={isRegistering}
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isEditMode ? "Salvar Alterações" : "Confirmar Cadastro"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DonorForm;
