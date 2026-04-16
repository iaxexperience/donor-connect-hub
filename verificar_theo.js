const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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
    if (error.message.includes("policy")) {
      console.log("💡 Nota: RLS está ativado. O script não tem permissão para ler sem login.");
    }
  } else if (data && data.length > 0) {
    console.log(`✅ Sucesso! Encontrei ${data.length} mensagens.`);
    console.table(data.map(m => ({
      Data: new Date(m.created_at).toLocaleString('pt-BR'),
      Quem: m.is_from_me ? 'Theo (Robô)' : 'Cliente',
      Telefone: m.telefone,
      Mensagem: m.text_body.substring(0, 50) + (m.text_body.length > 50 ? '...' : '')
    })));
    
    if (data.some(m => m.is_from_me)) {
      console.log("\n🚀 O THEO ESTÁ NO BANCO! O problema é puramente visual no seu painel.");
    } else {
      console.log("\n⚠️ Nenhuma mensagem do Theo encontrada. O problema é na ingestão.");
    }
  } else {
    console.log("⚠️ Nenhuma mensagem encontrada na tabela whatsapp_messages.");
  }
}

checkMessages();
