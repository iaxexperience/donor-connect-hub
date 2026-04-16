import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
  console.log("🔍 Verificando mensagens no banco de dados...");
  
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('created_at, text_body, is_from_me, telefone')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("❌ Erro ao ler mensagens:", error.message);
  } else if (data && data.length > 0) {
    console.log(`✅ Sucesso! Encontrei ${data.length} mensagens.`);
    console.table(data.map(m => ({
      Data: new Date(m.created_at).toLocaleString('pt-BR'),
      Quem: m.is_from_me ? 'Theo (Robô)' : 'Cliente',
      Telefone: m.telefone,
      Mensagem: m.text_body.substring(0, 50) + (m.text_body.length > 50 ? '...' : '')
    })));
  } else {
    console.log("⚠️ Nenhuma mensagem encontrada.");
  }
}

checkMessages();
