import { supabase } from "@/integrations/supabase/client";

export interface Setor {
  id: string;
  nome: string;
  descricao?: string;
  coordenador_id?: string | null;
  coordenador_nome: string;
  coordenador_email?: string;
  coordenador_telefone?: string;
  ramal?: string;
  cor?: string;
  status: "ativo" | "inativo";
  created_at: string;
  updated_at?: string;
}

const STORAGE_KEY = "pulse_setores_cache";

const INITIAL_SETORES: Setor[] = [
  {
    id: "1a8e2341-2b02-45e1-8cf9-000000000001",
    nome: "Telemarketing & Relacionamento",
    descricao: "Responsável pelo contato ativo com doadores, agendamento de follow-ups e campanhas telefônicas.",
    coordenador_nome: "Hospital FAP Admin",
    coordenador_email: "telemarketing@hospitaldafap.org.br",
    coordenador_telefone: "(83) 3182-0001",
    ramal: "101",
    cor: "#0284c7",
    status: "ativo",
    created_at: new Date().toISOString(),
  },
  {
    id: "2b9e2341-2b02-45e1-8cf9-000000000002",
    nome: "Captação de Recursos & Campanhas",
    descricao: "Gestão estratégica de campanhas de arrecadação, eventos beneficentes e parcerias institucionais.",
    coordenador_nome: "Coordenador de Captação",
    coordenador_email: "captacao@hospitaldafap.org.br",
    coordenador_telefone: "(83) 3182-0002",
    ramal: "102",
    cor: "#16a34a",
    status: "ativo",
    created_at: new Date().toISOString(),
  },
  {
    id: "3c9e2341-2b02-45e1-8cf9-000000000003",
    nome: "Financeiro & Caixa",
    descricao: "Controle de recebimentos externos, prestação de contas de caixa diário e conciliação bancária.",
    coordenador_nome: "Gestor Financeiro",
    coordenador_email: "financeiro@hospitaldafap.org.br",
    coordenador_telefone: "(83) 3182-0003",
    ramal: "103",
    cor: "#ea580c",
    status: "ativo",
    created_at: new Date().toISOString(),
  },
  {
    id: "4d9e2341-2b02-45e1-8cf9-000000000004",
    nome: "Logística & Doações Físicas",
    descricao: "Triagem, recebimento, armazenamento e distribuição de alimentos, cestas básicas e donativos materiais.",
    coordenador_nome: "Coordenador de Logística",
    coordenador_email: "logistica@hospitaldafap.org.br",
    coordenador_telefone: "(83) 3182-0004",
    ramal: "104",
    cor: "#9333ea",
    status: "ativo",
    created_at: new Date().toISOString(),
  },
  {
    id: "5e9e2341-2b02-45e1-8cf9-000000000005",
    nome: "Comunicação & Marketing",
    descricao: "Comunicação institucional, assessoria de imprensa, redes sociais e disparos de WhatsApp.",
    coordenador_nome: "Coordenador de Comunicação",
    coordenador_email: "comunicacao@hospitaldafap.org.br",
    coordenador_telefone: "(83) 3182-0005",
    ramal: "105",
    cor: "#e11d48",
    status: "ativo",
    created_at: new Date().toISOString(),
  },
];

export const setorService = {
  async getSetores(): Promise<Setor[]> {
    try {
      const { data, error } = await supabase
        .from("setores")
        .select("*")
        .order("nome", { ascending: true });

      if (!error && data && data.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data as Setor[];
      }
    } catch {
      // Fallback
    }

    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SETORES));
    return INITIAL_SETORES;
  },

  async createSetor(data: Omit<Setor, "id" | "created_at">): Promise<Setor> {
    const newSetor: Setor = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: dbData, error } = await supabase
        .from("setores")
        .insert([newSetor])
        .select()
        .single();

      if (!error && dbData) {
        const current = await this.getSetores();
        const updated = [...current.filter((s) => s.id !== dbData.id), dbData as Setor];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return dbData as Setor;
      }
    } catch {
      // ignore
    }

    // Local fallback
    const current = await this.getSetores();
    const updated = [newSetor, ...current];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newSetor;
  },

  async updateSetor(id: string, data: Partial<Setor>): Promise<Setor> {
    const updatePayload = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: dbData, error } = await supabase
        .from("setores")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (!error && dbData) {
        const current = await this.getSetores();
        const updated = current.map((s) => (s.id === id ? (dbData as Setor) : s));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return dbData as Setor;
      }
    } catch {
      // ignore
    }

    // Local fallback
    const current = await this.getSetores();
    const updated = current.map((s) => (s.id === id ? { ...s, ...updatePayload } : s));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated.find((s) => s.id === id)!;
  },

  async deleteSetor(id: string): Promise<void> {
    try {
      await supabase.from("setores").delete().eq("id", id);
    } catch {
      // ignore
    }

    const current = await this.getSetores();
    const updated = current.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },
};
