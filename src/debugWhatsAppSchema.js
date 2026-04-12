import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '');

async function checkSchema() {
  const tables = ['whatsapp_chats', 'whatsapp_messages', 'whatsapp_historicos', 'whatsapp_templates'];
  
  for (const table of tables) {
    console.log(`\nTable: ${table}`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`  ERROR: ${error.message}`);
    } else {
      console.log(`  OK (Found ${data.length} records)`);
      if (data.length > 0) {
        console.log(`  Sample record:`, JSON.stringify(data[0], null, 2));
      } else {
        // Try to get column names by selecting an empty set
        const { data: cols, error: cErr } = await supabase.from(table).select('*').limit(0);
        if (!cErr) {
             console.log(`  Table exists but is empty.`);
        }
      }
    }
  }
}

checkSchema();
