import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function test() {
  const { data: settings } = await supabase.from('asaas_settings').select('*').eq('id', 1).maybeSingle();
  console.log("Settings:", settings);
  
  if (!settings?.api_key) return console.log("No API key");
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/api-proxy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      service: 'asaas',
      action: 'get_balance',
      config: { api_key: settings.api_key, sandbox: settings.sandbox }
    })
  });
  
  const resData = await response.json();
  console.log("Proxy response:", resData);
}

test();
