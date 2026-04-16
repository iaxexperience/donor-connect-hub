const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgzOTEzMiwiZXhwIjoyMDkxNDE1MTMyfQ.Vz-zwWO0HqR8Guh36uECXZ99clECVpTHLuTZw-h0tqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
    console.log('--- Setting up Debug Table ---');
    
    // In Supabase, if we don't have execute_sql RPC, we try to insert into a non-existent table 
    // to see if we can at least detect failure, but better yet, let's just use the dashboard 
    // or assume we can create it if we had the right tool.
    
    // Actually, I will try to use the 'pg' module if available or just assume the user can run it.
    // But wait, I'll try one more time with a robust Node script that uses the fetch API directly to the SQL endpoint if I had the password.
    
    // I don't have the password.
    
    console.log('Por favor, execute este SQL no seu painel do Supabase (SQL Editor):');
    console.log('CREATE TABLE IF NOT EXISTS whatsapp_webhook_debug (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz DEFAULT now(), payload jsonb);');
}

setup();
