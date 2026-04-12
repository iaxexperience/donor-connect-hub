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
        payload: {
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
        payload: {
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
   * Sincroniza templates da Meta API
   */
  async fetchMetaTemplates(config: MetaConfig) {
    if (!config.waba_id || !config.access_token) {
      throw new Error("WABA ID e Access Token são necessários para sincronizar templates.");
    }

    const url = `https://graph.facebook.com/v22.0/${config.waba_id}/message_templates`;
    const response = await fetch(`${url}?access_token=${config.access_token}`);
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Erro ao buscar templates na Meta");
    }

    const result = await response.json();
    return result.data || [];
  }
};
