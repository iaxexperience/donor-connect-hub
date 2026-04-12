import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppSettings {
  waba_id: string;
  phone_number_id: string;
  access_token: string;
  webhook_url: string;
}

export const getWhatsAppSettings = async (): Promise<WhatsAppSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Record not found
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Erro ao buscar configurações do WhatsApp:", error);
    return null;
  }
};

export const saveWhatsAppSettings = async (settings: WhatsAppSettings) => {
  const { error } = await supabase
    .from('whatsapp_settings')
    .upsert({
      id: 1,
      ...settings,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
  return true;
};
