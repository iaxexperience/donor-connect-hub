import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('--- Database Audit ---');
  const tables = ['whatsapp_chats', 'whatsapp_messages', 'whatsapp_historicos', 'whatsapp_templates'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(5);
    if (error) {
      console.log(`[${table}] Error: ${error.message}`);
    } else {
      console.log(`[${table}] OK. Records: ${data.length}`);
      if (data.length > 0) {
        console.log(`  Data:`, JSON.stringify(data, null, 2));
      }
    }
  }

  console.log('\n--- Checking RLS (Attempting Select) ---');
  // If we get an error or empty list even if data exists, RLS might be the issue
}

check();
