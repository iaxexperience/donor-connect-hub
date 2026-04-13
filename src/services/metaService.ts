import { supabase } from "@/integrations/supabase/client";

export interface MetaConfig {
  phone_number_id: string;
  access_token: string;
  waba_id?: string;
}

export const metaService = {
  /**
   * Envia uma mensagem de texto via Edge Function Proxy
   */
  async sendTextMessage(to: string, text: string, config: MetaConfig, donorId?: number) {
    if (!config.phone_number_id || !config.access_token) {
      throw new Error("Configurações da Meta API incompletas.");
    }

    const { data, error } = await supabase.functions.invoke('meta-whatsapp-proxy', {
      body: {
        action: 'send_message',
        donor_id: donorId,
        config: {
          phone_number_id: config.phone_number_id,
          access_token: config.access_token
        },
        meta_data: {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: to.replace(/\D/g, ""),
          type: "text",
          text: { body: text }
        }
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Envia uma mensagem de mídia (imagem/vídeo) via Edge Function Proxy
   */
  async sendMediaMessage(to: string, mediaUrl: string, type: 'image' | 'video', config: MetaConfig, donorId?: number) {
    if (!config.phone_number_id || !config.access_token) {
      throw new Error("Configurações da Meta API incompletas.");
    }

    const { data, error } = await supabase.functions.invoke('meta-whatsapp-proxy', {
      body: {
        action: 'send_message',
        donor_id: donorId,
        config: {
          phone_number_id: config.phone_number_id,
          access_token: config.access_token
        },
        meta_data: {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: to.replace(/\D/g, ""),
          type: type,
          [type]: { link: mediaUrl }
        }
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Envia um template via Edge Function Proxy
   */
  async sendTemplateMessage(to: string, templateName: string, languageCode: string, components: any[], config: MetaConfig, donorId?: number, batchId?: string) {
    if (!config.phone_number_id || !config.access_token) {
      throw new Error("Configurações da Meta API incompletas.");
    }

    const { data, error } = await supabase.functions.invoke('meta-whatsapp-proxy', {
      body: {
        action: 'send_template',
        donor_id: donorId,
        batch_id: batchId,
        config: {
          phone_number_id: config.phone_number_id,
          access_token: config.access_token
        },
        meta_data: {
          messaging_product: "whatsapp",
          to: to.replace(/\D/g, ""),
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            components: components
          }
        }
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sincroniza templates da Meta API via meta-whatsapp-proxy Edge Function
   */
  async fetchMetaTemplates(config: MetaConfig) {
    const wabaId = config.waba_id?.trim();
    const token = config.access_token?.trim();

    if (!wabaId || !token) {
      throw new Error("WABA ID e Access Token são necessários para sincronizar templates.");
    }

    const { data, error } = await supabase.functions.invoke('meta-whatsapp-proxy', {
      body: {
        action: 'get_templates',
        config: {
          waba_id: wabaId,
          access_token: token
        }
      }
    });

    if (error) throw error;
    return data.data || [];
  },

  /**
   * Salva templates no banco de dados
   */
  async saveMetaTemplates(templates: any[]) {
    // Normalizar para o banco
    const toInsert = templates.map(t => ({
      name: t.name,
      category: t.category,
      language: t.language,
      status: t.status,
      components: t.components
    }));

    const { error } = await supabase
      .from('whatsapp_templates')
      .upsert(toInsert, { onConflict: 'name' });

    if (error) throw error;
  },

  /**
   * Busca templates salvos no banco
   */
  async getStoredTemplates() {
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Cria um novo template na Meta API via meta-whatsapp-proxy Edge Function
   */
  async createTemplate(payload: any, config: MetaConfig) {
    const wabaId = config.waba_id?.trim();
    const token = config.access_token?.trim();
    
    if (!wabaId || !token) {
      throw new Error("WABA ID e Access Token são necessários para criar templates.");
    }

    try {
      console.log('[Meta Service] Creating template via meta-whatsapp-proxy...');
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-proxy', {
        body: {
          action: 'create_template',
          config: {
            waba_id: wabaId,
            access_token: token
          },
          meta_data: payload
        }
      });

      console.log('[Meta Service] Invocation Result:', { data, error });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (err: any) {
       console.warn("[Meta Service] Invoke failed or network error, trying direct fetch fallback...", err);
       
       // Improved fallback with cache-busting to bypass potential proxy/cache issues
       const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-whatsapp-proxy?t=${Date.now()}`;
       
       try {
         const response = await fetch(functionUrl, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
             'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
           },
           body: JSON.stringify({
             action: 'create_template',
             config: { waba_id: wabaId, access_token: token },
             meta_data: payload
           })
         });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("[Meta Service] Fallback server returned error:", { status: response.status, errorData });
            throw new Error(errorData.error?.message || errorData.message || `Erro do Servidor (HTTP ${response.status})`);
          }

          return await response.json();
        } catch (fetchErr: any) {
          console.error("[Meta Service] Fallback also failed:", fetchErr);
          const isNetworkError = fetchErr.message.includes("Failed to fetch") || fetchErr.name === "TypeError";
          if (isNetworkError) {
             throw new Error("Erro de Rede: A requisição foi bloqueada ou o servidor está inacessível. Verifique se há ad-blockers ativos ou problemas de CSP no Lovable.");
          }
          throw new Error(`Erro de Conexão: ${fetchErr.message}`);
        }
    }
  }
};
