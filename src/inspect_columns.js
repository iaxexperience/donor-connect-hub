import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  console.log('--- Inspecting Columns ---');
  
  const tables = ['whatsapp_chats', 'whatsapp_messages'];
  
  for (const table of tables) {
    console.log(`\nTable: ${table}`);
    // Use a hack to get column names: select a non-existent column or just look at the error of a wrong insert
    const { error } = await supabase.from(table).insert({ non_existent_column_audit: true });
    console.log(`  Structure check error (expected): ${error?.message}`);
  }
}

checkColumns();
