import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Search, Plus, Filter, MessageSquare, Upload, FileDown, CheckCircle2, GitMerge, Edit, Trash2, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDonors } from "@/hooks/useDonors";
import { useAuth } from "@/contexts/AuthContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import { typeLabel, typeBadgeStyle } from "@/lib/donationService";

// INITIAL_DONORS moved to hook
const Doadores = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { donors, addDonation, deleteDonor, isDonationPending, isLoading: donorsLoading, importDonors } = useDonors();
  const { campaigns, isLoading: campaignsLoading } = useCampaigns();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDonorId, setSelectedDonorId] = useState<string>("");
  const [donationAmount, setDonationAmount] = useState<string>("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Pix");
  const { toast } = useToast();

  const handleRegisterDonation = () => {
    if (!selectedDonorId || !donationAmount) {
      toast({ title: "Erro", description: "Selecione um doador e informe o valor.", variant: "destructive" });
      return;
    }

    addDonation(parseInt(selectedDonorId), parseFloat(donationAmount), selectedCampaignId || undefined, paymentMethod);

    toast({
      title: "Doação Registrada!",
      description: `O registro está sendo processado e o dashboard será atualizado.`,
    });

    setIsDialogOpen(false);
    setDonationAmount("");
    setSelectedCampaignId("");
  };

  const handleDeleteDonor = async (id: number) => {
    try {
      await deleteDonor(id);
      toast({
        title: "Doador Excluído",
        description: "O registro foi removido com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao Excluir",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/modelo_importacao_doadores.csv";
    link.download = "modelo_importacao_doadores.csv";
    link.click();
  };

  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .trim();
  };

  const formatDateToISO = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== "string") return null;
    
    // Tenta formato DD/MM/YYYY para YYYY-MM-DD
    const parts = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (parts) {
      const day = parts[1].padStart(2, "0");
      const month = parts[2].padStart(2, "0");
      const year = parts[3];
      return `${year}-${month}-${day}`;
    }
    
    // Se já for YYYY-MM-DD (ISO)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.substring(0, 10);
    }

    return null;
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    // Detect encoding: check for UTF-8 BOM, otherwise use Windows-1252 (Excel default on Windows)
    const reader = new FileReader();
    reader.onload = (e) => {
      const bytes = new Uint8Array(e.target!.result as ArrayBuffer);
      const hasUtf8Bom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
      // Heuristic: if any byte > 0x7F that forms a valid UTF-8 sequence, it's UTF-8
      let looksLikeUtf8 = hasUtf8Bom;
      if (!hasUtf8Bom) {
        for (let i = 0; i < Math.min(bytes.length, 2000); i++) {
          if (bytes[i] > 0x7F) {
            // Check if it's a valid UTF-8 multibyte sequence
            if ((bytes[i] & 0xE0) === 0xC0 && i + 1 < bytes.length && (bytes[i + 1] & 0xC0) === 0x80) {
              looksLikeUtf8 = true;
              break;
            }
          }
        }
      }
      const encoding = looksLikeUtf8 ? "UTF-8" : "windows-1252";
      const text = new TextDecoder(encoding).decode(bytes.slice(hasUtf8Bom ? 3 : 0));

      Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const { data } = results;
          if (!data || data.length === 0) throw new Error("Arquivo vazio.");

          let startIndex = 0;
          let columns = {
            name: 0,
            email: 1,
            phone: 2,
            document_id: 3,
            type: 4,
            last_donation_date: 5,
            birth_date: 6,
            zip_code: 7,
            address: 8,
            address_number: 9,
            complement: 10,
            neighborhood: 11,
            city: 12,
            state: 13
          };

          // Detectar se a primeira linha é cabeçalho
          const firstRow = data[0] as string[];
          const isHeader = firstRow.some(cell => 
            /nome|name|email|telefone|phone|cpf|cnpj|tipo|type|data/i.test(String(cell))
          );

          if (isHeader) {
            startIndex = 1;
            // Mapear índices baseado nos nomes encontrados
            firstRow.forEach((cell, idx) => {
              const c = normalizeString(String(cell));
              if (c.includes("nome") || c.includes("name")) columns.name = idx;
              else if (c.includes("email")) columns.email = idx;
              else if (c.includes("telefone") || c.includes("phone") || c.includes("celular")) columns.phone = idx;
              else if (c.includes("cpf") || c.includes("cnpj") || c.includes("documento")) columns.document_id = idx;
              else if (c.includes("tipo") || c.includes("classificacao") || c.includes("type")) columns.type = idx;
              else if (c.includes("nascimento")) columns.birth_date = idx;
              else if (c.includes("doacao") || c.includes("data")) columns.last_donation_date = idx;
              else if (c.includes("cep") || c.includes("zip")) columns.zip_code = idx;
            });
          }

          const formattedDonors = data.slice(startIndex).map((row: any) => {
            const rawType = normalizeString((row[columns.type] || "lead").toString());
            let finalType: "lead" | "unico" | "esporadico" | "recorrente" = "lead";
            
            if (rawType.includes("recorrente")) finalType = "recorrente";
            else if (rawType.includes("esporadico") || rawType.includes("esporadica")) finalType = "esporadico";
            else if (rawType.includes("unico") || rawType.includes("unica")) finalType = "unico";

            return {
              name: (row[columns.name] || "Doador sem Nome").toString().trim(),
              email: (row[columns.email] && row[columns.email].toString().includes("@"))
                ? row[columns.email].toString().trim()
                : null,
              phone: (row[columns.phone] || "").toString().replace(/\D/g, ""),
              document_id: row[columns.document_id] || null,
              type: finalType,
              last_donation_date: formatDateToISO(row[columns.last_donation_date]),
              birth_date: formatDateToISO(row[columns.birth_date]),
              zip_code: row[columns.zip_code] || null,
              address: row[columns.address] || null,
              address_number: row[columns.address_number] || null,
              complement: row[columns.complement] || null,
              neighborhood: row[columns.neighborhood] || null,
              city: row[columns.city] || null,
              state: (row[columns.state] || null)?.toString().toUpperCase().slice(0, 2),
              total_donated: 0,
              donation_count: 0
            };
          }).filter((d: any) => d.name && d.name !== "Doador sem Nome"); 

          // Remover duplicatas de e-mail dentro do próprio arquivo CSV antes de enviar
          const uniqueDonorsMap = new Map();
          formattedDonors.forEach(donor => {
            if (donor.email) {
              if (!uniqueDonorsMap.has(donor.email)) {
                uniqueDonorsMap.set(donor.email, donor);
              }
            } else {
              // Para doadores sem e-mail, geramos uma chave única para não filtrá-los
              uniqueDonorsMap.set(`no-email-${Math.random()}`, donor);
            }
          });
          
          const finalDonorsList = Array.from(uniqueDonorsMap.values());

          if (finalDonorsList.length === 0) {
            throw new Error("Nenhum doador válido encontrado no arquivo.");
          }

          const result = await importDonors(finalDonorsList);
          const inserted = (result as any)?.inserted ?? finalDonorsList.length;
          const skipped = (result as any)?.skipped ?? 0;

          toast({
            title: "Importação Concluída!",
            description: skipped > 0
              ? `${inserted} doadores importados. ${skipped} ignorados (já existiam).`
              : `${inserted} doadores importados com sucesso.`,
          });
          
          if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (error: any) {
          toast({
            title: "Erro na Importação",
            description: error.message,
            variant: "destructive"
          });
        } finally {
          setIsImporting(false);
        }
      },
      error: (error) => {
        toast({
          title: "Erro ao ler arquivo",
          description: (error as any).message,
          variant: "destructive"
        });
        setIsImporting(false);
      }
    });
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredDonors = donors.filter(d => {
    const donorName = d.name || "";
    const donorEmail = d.email || "";
    const matchesSearch = donorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         donorEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || d.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Doadores</h1>
          <p className="text-muted-foreground text-sm">Gerencie sua base de doadores e acompanhe contribuições.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">
                <Heart className="w-4 h-4 mr-2" />
                Registrar Doação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nova Doação</DialogTitle>
                <DialogDescription>
                  O sistema atualizará automaticamente a classificação e agendará o follow-up.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Doador</Label>
                  <Select onValueChange={setSelectedDonorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um doador" />
                    </SelectTrigger>
                    <SelectContent>
                      {donors.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={donationAmount} 
                      onChange={(e) => setDonationAmount(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Campanha</Label>
                    <Select onValueChange={setSelectedCampaignId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma campanha" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Método de Pagamento</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pix">Pix</SelectItem>
                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="Cartão">Cartão</SelectItem>
                        <SelectItem value="Boleto">Boleto</SelectItem>
                        <SelectItem value="Manual">Manual (Outros)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button 
                  onClick={handleRegisterDonation} 
                  disabled={isDonationPending}
                  className="gap-2 shrink-0"
                >
                  {isDonationPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    "Confirmar Doação"
                  )}
                </Button>

              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Importar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Doadores</DialogTitle>
                <DialogDescription>
                  Selecione um arquivo CSV com o cabeçalho correto para importar sua base.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".csv" 
                  onChange={handleFileImport}
                />
                <div 
                  className="border-2 border-dashed border-muted rounded-2xl p-10 flex flex-col items-center justify-center gap-3 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="p-4 rounded-full bg-primary/10 group-hover:scale-110 transition-transform">
                    {isImporting ? (
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">
                      {isImporting ? "Processando arquivo..." : "Clique para selecionar o CSV"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Formato suportado: .csv (separado por ';' ou ',')</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <FileDown className="w-3 h-3" />
                    Exemplo de Modelo
                  </p>
                  <Button 
                    variant="ghost" 
                    className="w-full h-10 border border-muted text-xs justify-between group"
                    onClick={handleDownloadTemplate}
                  >
                    <span>modelo_importacao_doadores.csv</span>
                    <Badge variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      Baixar
                    </Badge>
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImporting(false)}>Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline" 
            className="border-primary/50 text-primary hover:bg-primary/5" 
            onClick={() => navigate("/dashboard/kanbam")}
          >
            <GitMerge className="w-4 h-4 mr-2" />
            Ver no Kanbam
          </Button>
          <Button className="bg-primary shadow-glow" onClick={() => navigate("/dashboard/doadores/novo")}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Doador
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar doador..." 
            className="pl-9" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Classificação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Classificações</SelectItem>
            <SelectItem value="lead">Leads</SelectItem>
            <SelectItem value="recorrente">Recorrente</SelectItem>
            <SelectItem value="esporadico">Esporádico</SelectItem>
            <SelectItem value="unico">Único</SelectItem>
            <SelectItem value="desativado">Desativado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Classificação</TableHead>
              <TableHead>Total Doado</TableHead>
              <TableHead>Última Doação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {donorsLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-xs">Carregando doadores...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredDonors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Nenhum doador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredDonors.map((donor) => (
                <TableRow key={donor.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{donor.name}</TableCell>
                  <TableCell>{donor.email}</TableCell>
                  <TableCell>{donor.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={typeBadgeStyle(donor.type)}>
                      {typeLabel[donor.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(donor.total_donated)}
                  </TableCell>
                  <TableCell>{donor.last_donation_date ? new Date(donor.last_donation_date).toLocaleDateString("pt-BR") : "Nunca"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => navigate(`/dashboard/doadores/editar/${donor.id}`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      {role === 'admin' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Doador</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir <strong>{donor.name}</strong>? Esta ação não pode ser desfeita e removerá todos os registros relacionados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteDonor(donor.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Doadores;
