import { supabase } from "@/integrations/supabase/client";

export interface MetaConfig {
  phone_number_id: string;
  access_token: string;
  waba_id?: string;
}

// ── Internal helper ────────────────────────────────────────────────────────
// Uses the neutral "api-proxy" Edge Function instead of "meta-whatsapp-proxy"
// to avoid CSP/ad-blocker blocks in preview environments like Lovable.
// The api-proxy ALWAYS returns HTTP 200, embedding errors in the body as:
// { __error: true, error: "message" } or { __meta_status: 400, error: {...} }
async function callProxy(body: object): Promise<any> {
  const { data, error } = await supabase.functions.invoke('api-proxy', { body });

  if (error) {
    // If Supabase SDK itself is blocked (CSP / ad-blocker), fall back to direct fetch
    console.warn('[metaService] Supabase invoke failed, trying direct fetch...', error);
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-proxy`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Falha na conexão com o servidor (HTTP ${res.status}). Verifique se a Edge Function "api-proxy" está deployada.`);
    }

    const fallbackData = await res.json();
    return checkProxyResponse(fallbackData);
  }

  return checkProxyResponse(data);
}

// Checks for embedded errors returned by api-proxy (which always returns HTTP 200)
function checkProxyResponse(data: any): any {
  if (!data) return data;

  // __error: true → internal api-proxy error
  if (data.__error) {
    throw new Error(data.error || 'Erro interno no proxy.');
  }

  // __meta_status >= 400 → Meta API returned an error
  if (data.__meta_status && data.__meta_status >= 400) {
    const metaErr = data.error || data;
    const msg = metaErr?.error_user_title
      ? `${metaErr.error_user_title}: ${metaErr.error_user_msg || metaErr.message}`
      : metaErr?.message || `Meta API retornou status ${data.__meta_status}`;
    throw new Error(msg);
  }

  return data;
}

// Removing syncToDatabase because api-proxy handles DB insertion atomically

export const metaService = {
  /** Envia mensagem de texto via api-proxy */
  async sendTextMessage(to: string, text: string, config: MetaConfig, donorId?: number) {
    if (!config.phone_number_id || !config.access_token) {
      throw new Error("Configurações da Meta API incompletas.");
    }
    const cleanPhone = to.replace(/\D/g, "");
    const resp = await callProxy({
      service: 'meta',
      action: 'send_message',
      donor_id: donorId,
      config: {
        phone_number_id: config.phone_number_id,
        access_token: config.access_token,
      },
      payload: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { body: text },
      },
    });

    return resp;
  },

  /** Envia mensagem de mídia via api-proxy */
  async sendMediaMessage(to: string, mediaUrl: string, type: 'image' | 'video', config: MetaConfig, donorId?: number) {
    if (!config.phone_number_id || !config.access_token) {
      throw new Error("Configurações da Meta API incompletas.");
    }
    const cleanPhone = to.replace(/\D/g, "");
    const resp = await callProxy({
      service: 'meta',
      action: 'send_message',
      donor_id: donorId,
      config: {
        phone_number_id: config.phone_number_id,
        access_token: config.access_token,
      },
      payload: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type,
        [type]: { link: mediaUrl },
      },
    });

    return resp;
  },

  /** Envia documento (PDF) via api-proxy */
  async sendDocumentMessage(to: string, docUrl: string, fileName: string, config: MetaConfig, donorId?: number) {
    if (!config.phone_number_id || !config.access_token) {
      throw new Error("Configurações da Meta API incompletas.");
    }
    const cleanPhone = to.replace(/\D/g, "");
    const resp = await callProxy({
      service: 'meta',
      action: 'send_message',
      donor_id: donorId,
      config: {
        phone_number_id: config.phone_number_id,
        access_token: config.access_token,
      },
      payload: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "document",
        document: { 
          link: docUrl,
          filename: fileName
        },
      },
    });

    return resp;
  },

  /** Envia template via api-proxy */
  async sendTemplateMessage(to: string, templateName: string, languageCode: string, components: any[], config: MetaConfig, donorId?: number, batchId?: string) {
    if (!config.phone_number_id || !config.access_token) {
      throw new Error("Configurações da Meta API incompletas.");
    }
    const cleanPhone = to.replace(/\D/g, "");
    const resp = await callProxy({
      service: 'meta',
      action: 'send_template',
      donor_id: donorId,
      batch_id: batchId,
      config: {
        phone_number_id: config.phone_number_id,
        access_token: config.access_token,
      },
      payload: {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      },
    });

    return resp;
  },

  /** Busca templates da Meta API via api-proxy */
  async fetchMetaTemplates(config: MetaConfig) {
    const wabaId = config.waba_id?.trim();
    const token = config.access_token?.trim();
    if (!wabaId || !token) {
      throw new Error("WABA ID e Access Token são necessários para sincronizar templates.");
    }
    const data = await callProxy({
      service: 'meta',
      action: 'get_templates',
      config: { waba_id: wabaId, access_token: token },
      payload: {},
    });
    return data.data || [];
  },

  /** Salva templates no banco de dados */
  async saveMetaTemplates(templates: any[]) {
    const toInsert = templates.map(t => ({
      name: t.name,
      category: t.category,
      language: t.language,
      status: t.status,
      components: t.components,
    }));
    const { error } = await supabase
      .from('whatsapp_templates')
      .upsert(toInsert, { onConflict: 'name' });
    if (error) throw error;
  },

  /** Busca templates salvos no banco */
  async getStoredTemplates() {
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  /**
   * Cria um novo template na Meta API via api-proxy Edge Function
   * Estratégia: salva localmente como PENDING, depois tenta a Meta.
   */
  async createTemplate(payload: any, config: MetaConfig) {
    const wabaId = config.waba_id?.trim();
    const token = config.access_token?.trim();

    if (!wabaId || !token) {
      throw new Error("WABA ID e Access Token são necessários para criar templates.");
    }

    console.log('[metaService] Creating template via api-proxy:', payload.name);

    // 1. Save locally as PENDING first (the DB record is created immediately)
    const { error: dbError } = await supabase
      .from('whatsapp_templates')
      .upsert([{
        name: payload.name,
        category: payload.category,
        language: payload.language,
        status: 'PENDING',
        components: payload.components,
      }], { onConflict: 'name' });

    if (dbError) {
      console.warn('[metaService] Could not save locally:', dbError.message);
    }

    // 2. Try to create at Meta via proxy
    const data = await callProxy({
      service: 'meta',
      action: 'create_template',
      config: { waba_id: wabaId, access_token: token },
      payload,
    });

    console.log('[metaService] Meta response:', JSON.stringify(data));

    // 3. If Meta returned an ID, update local status
    if (data?.id) {
      await supabase
        .from('whatsapp_templates')
        .update({ status: 'PENDING_REVIEW' })
        .eq('name', payload.name);
    }

    // 4. If Meta returned an error object inside a 200, throw it
    if (data?.error) {
      throw new Error(
        data.error.error_user_title
          ? `${data.error.error_user_title}: ${data.error.error_user_msg || data.error.message}`
          : data.error.message || JSON.stringify(data.error)
      );
    }

    return data;
  },
};
