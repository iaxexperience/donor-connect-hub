import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function saveCerts() {
  console.log("Lendo arquivos de certificado...");
  const cert = fs.readFileSync('bb_client.crt', 'utf8');
  const key = fs.readFileSync('bb_client.key', 'utf8');

  console.log("Salvando no banco de dados (bb_settings)...");
  const { error } = await supabase
    .from('bb_settings')
    .update({ 
      client_cert: cert,
      client_key: key,
      updated_at: new Date().toISOString()
    })
    .eq('id', 1);

  if (error) {
    console.error("Erro ao salvar certificados:", error.message);
  } else {
    console.log("Certificados salvos com sucesso!");
  }
}

saveCerts();
