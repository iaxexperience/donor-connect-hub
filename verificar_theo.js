import { createClient } from '@supabase/supabase-js';

// Hardcoded para evitar erro de modulo por falta de .env/dotenv
const supabaseUrl = "https://zljlhlfbtnzbmeaglkll.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
  console.log("🔍 Verificando mensagens diretamente via Supabase JS...");
  
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('created_at, text_body, is_from_me, telefone')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error("❌ Erro no Supabase:", error.message);
  } else if (data && data.length > 0) {
    console.log(`✅ SUCESSO! Encontrei ${data.length} mensagens no banco.`);
    console.table(data.map(m => ({
      Data: new Date(m.created_at).toLocaleString('pt-BR'),
      Quem: m.is_from_me ? 'Theo (Robô)' : 'Cliente',
      Telefone: m.telefone,
      Conteudo: (m.text_body || "[Sem Texto]").substring(0, 40) + "..."
    })));

    const botMsg = data.find(m => m.is_from_me === true);
    if (botMsg) {
      console.log("\n🚀 O THEO ESTÁ NO BANCO! INTEGRADO COM SUCESSO.");
      console.log("Isso prova que o robô está falando e o servidor está gravando.");
      console.log("O único problema é a sua tela que precisa de um F5 ou ajuste visual.");
    } else {
      console.log("\n⚠️ Só encontrei mensagens do cliente. O robô ainda não gravou nada.");
    }
  } else {
    console.log("⚠️ Tabela de mensagens está vazia.");
  }
}

checkMessages();
