import { toast } from "sonner";
import { supabase } from "./supabase";

export interface WhatsAppPayload {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: string;
  template: {
    name: string;
    language: { code: string };
    components: Array<{
      type: string;
      parameters: Array<{ type: string; text: string }>;
    }>;
  };
}

export interface MetaTemplate {
  name: string;
  status: string;
  category: string;
  language: string;
  components: any[];
  id: string;
}

const getStoredCredentials = () => {
  try {
    return {
      wabaId: localStorage.getItem("meta_waba_id") || "",
      phoneId: localStorage.getItem("meta_phone_id") || "",
      token: localStorage.getItem("meta_access_token") || "",
    };
  } catch (e) {
    return { wabaId: "", phoneId: "", token: "" };
  }
};

export const validateMetaCredentials = async (wabaId: string, phoneId: string, token: string) => {
  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || "Credenciais inválidas");
    }
    return { success: true, data };
  } catch (error: any) {
    console.error("Meta API Validation Error:", error);
    return { success: false, error: error.message };
  }
};

export const fetchMetaTemplates = async () => {
  const { wabaId, token } = getStoredCredentials();
  
  if (!wabaId || !token) {
    throw new Error("WABA ID ou Token não configurados");
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    // Map Meta format to our internal format used in UI
    const mappedTemplates = data.data.map((tpl: any) => {
      const bodyComponent = tpl.components.find((c: any) => c.type === "BODY");
      return {
        name: tpl.name,
        category: tpl.category,
        status: tpl.status,
        body: bodyComponent?.text || "",
        language: tpl.language,
        variables: bodyComponent?.text?.match(/{{(\d+)}}/g)?.length || 0
      };
    });

    localStorage.setItem("meta_templates", JSON.stringify(mappedTemplates));
    return mappedTemplates;
  } catch (error: any) {
    console.error("Meta API Templates Error:", error);
    throw error;
  }
};

export const createMetaTemplate = async (templateData: any) => {
  const { wabaId, token } = getStoredCredentials();
  
  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(templateData)
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    return data;
  } catch (error: any) {
    console.error("Meta API Create Template Error:", error);
    throw error;
  }
};

export const sendWhatsAppThankYou = async (donorName: string, amount: number, phone: string, campaign: string) => {
  const cleanPhone = phone.replace(/\D/g, "");
  const { phoneId, token } = getStoredCredentials();

  const payload: WhatsAppPayload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "template",
    template: {
      name: "agradecimento_doacao",
      language: { code: "pt_BR" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: donorName },
            { type: "text", text: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount) },
          ]
        }
      ]
    }
  };

  try {
    let success = false;
    let apiResponse = null;

    if (token && phoneId) {
      const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      apiResponse = await response.json();
      success = !apiResponse.error;
    }

    // Log event in localStorage for the Integracoes page to show
    const logs = JSON.parse(localStorage.getItem("whatsapp_logs") || "[]");
    logs.unshift({
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      event: "message_sent",
      status: success ? "success" : "falha",
      to: cleanPhone,
      error: apiResponse?.error?.message,
      payload: JSON.stringify(payload, null, 2)
    });
    localStorage.setItem("whatsapp_logs", JSON.stringify(logs.slice(0, 50)));

    if (success) {
      toast.success(`Agradecimento enviado para ${donorName} via WhatsApp!`, {
        description: `Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}`,
      });
    } else if (token) {
      toast.error(`Falha ao enviar WhatsApp: ${apiResponse?.error?.message}`);
    } else {
      console.log("SIMULATION MODE: Send WhatsApp to", cleanPhone, payload);
    }

    return apiResponse || payload;
  } catch (error: any) {
    console.error("Send WhatsApp Error:", error);
    return { error: error.message };
  }
};

export const sendWhatsAppDirectMessage = async (
  to: string, 
  message: string, 
  credentials: { phoneId: string, token: string },
  donorId?: string | number
) => {
  const cleanPhone = to.replace(/\D/g, "");
  const { phoneId, token } = credentials;

  if (!token || !phoneId) {
    throw new Error("WhatsApp não configurado. Verifique as credenciais na aba de configurações.");
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "text",
    text: { body: message }
  };

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (data.error) throw new Error(data.error.message);

    // Persistir no Banco de Dados se o disparo foi sucesso
    if (donorId) {
      const { error: dbError } = await supabase
        .from('whatsapp_messages')
        .insert([{
          donor_id: donorId,
          sender_id: 'me',
          text: message,
          status: 'sent',
          metadata: { waba_message_id: data.messages?.[0]?.id }
        }]);
      
      if (dbError) console.error("Erro ao salvar mensagem no banco:", dbError);
    }

    return data;
  } catch (error: any) {
    console.error("Meta API Direct Message Error:", error);
    throw error;
  }
};
