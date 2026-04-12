import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function check() {
  console.log("--- Verificando Tabelas WhatsApp ---");
  
  // Verificar Settings
  const { data: settings, error: sError } = await supabase.from('whatsapp_settings').select('*').limit(1);
  console.log("whatsapp_settings:", sError ? `ERRO (${sError.message})` : "OK");
  if (settings && settings[0]) {
    console.log("Configurações encontradas no banco: SIM");
  }

  // Verificar Messages
  const { error: mError } = await supabase.from('whatsapp_messages').select('*').limit(1);
  console.log("whatsapp_messages:", mError ? `MISSING (${mError.message})` : "OK");
}

check();
