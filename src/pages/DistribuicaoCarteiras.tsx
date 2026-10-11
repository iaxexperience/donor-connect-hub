import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Shuffle, Loader2, Users } from "lucide-react";

interface OperatorRow {
  id: string;
  name: string;
  carteiraCount: number;
}

export default function DistribuicaoCarteiras() {
  const { toast } = useToast();
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [countPerOperator, setCountPerOperator] = useState("10");
  const [distributing, setDistributing] = useState(false);

  const fetchOperators = async () => {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id,name")
      .eq("role", "operador")
      .eq("status", "Ativo")
      .order("name");
    if (error) {
      toast({ title: "Erro ao carregar operadores", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows: OperatorRow[] = [];
    for (const p of profiles || []) {
      const { count } = await supabase
        .from("donors")
        .select("id", { count: "exact", head: true })
        .eq("assigned_operator_id", p.id);
      rows.push({ id: p.id, name: p.name, carteiraCount: count || 0 });
    }
    setOperators(rows);
    setLoading(false);
  };

  useEffect(() => { fetchOperators(); }, []);

  const handleDistribute = async () => {
    const count = parseInt(countPerOperator, 10);
    if (!count || count <= 0) {
      toast({ title: "Informe uma quantidade válida", variant: "destructive" });
      return;
    }
    setDistributing(true);
    try {
      const { data, error } = await supabase.rpc("auto_distribute_donors", { p_count_per_operator: count });
      if (error) throw error;
      const total = (data || []).reduce((s: number, r: any) => s + r.assigned_count, 0);
      toast({
        title: total > 0 ? "Doadores distribuídos!" : "Nenhum doador disponível",
        description: total > 0
          ? `${total} doador(es) distribuído(s) entre ${data.length} operador(es).`
          : "Não há doadores prontos para contato sem carteira no momento.",
      });
      fetchOperators();
    } catch (error: any) {
      toast({ title: "Erro ao distribuir", description: error.message, variant: "destructive" });
    } finally {
      setDistributing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shuffle className="w-6 h-6 text-primary" /> Distribuição de Carteiras
        </h1>
        <p className="text-muted-foreground text-sm">
          Reparte doadores prontos para contato (sem carteira ainda) entre os operadores de telemarketing ativos, em rodízio.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap items-end gap-4">
          <div>
            <Label className="mb-1.5 block">Doadores por operador</Label>
            <Input
              type="number"
              min={1}
              value={countPerOperator}
              onChange={e => setCountPerOperator(e.target.value)}
              className="w-[140px]"
            />
          </div>
          <Button onClick={handleDistribute} disabled={distributing}>
            <Shuffle className="w-4 h-4 mr-2" />
            {distributing ? "Distribuindo..." : "Distribuir Automaticamente"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operador</TableHead>
                <TableHead className="text-right">Doadores na carteira</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={2} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : operators.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center py-10 text-muted-foreground">Nenhum operador de telemarketing ativo.</TableCell></TableRow>
              ) : operators.map(op => (
                <TableRow key={op.id}>
                  <TableCell className="font-medium flex items-center gap-2"><Users className="w-3.5 h-3.5 text-muted-foreground" />{op.name}</TableCell>
                  <TableCell className="text-right">{op.carteiraCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
