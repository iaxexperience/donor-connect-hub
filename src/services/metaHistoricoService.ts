import { supabase } from "@/integrations/supabase/client";

export const metaHistoricoService = {
  /**
   * Busca o histórico de disparos
   */
  async getHistory(filters?: { status?: string; donorId?: number; limit?: number }) {
    let query = supabase
      .from('whatsapp_historicos')
      .select(`
        *,
        donors (name)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.donorId) {
      query = query.eq('donor_id', filters.donorId);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Salva um log de erro
   */
  async logError(destinatario: string, error: string, template?: string, donorId?: number) {
    const { error: insertError } = await supabase
      .from('whatsapp_historicos')
      .insert([{
        donor_id: donorId,
        destinatario: destinatario,
        template: template,
        mensagem: "Erro no envio",
        status: 'error',
        erro_mensagem: error
      }]);
    
    return insertError;
  }
};
