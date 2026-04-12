import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAny() {
  console.log('--- Checking for ANY records in WhatsApp tables ---');
  const t1 = await supabase.from('whatsapp_chats').select('count', { count: 'exact' });
  const t2 = await supabase.from('whatsapp_messages').select('count', { count: 'exact' });
  const t3 = await supabase.from('donors').select('count', { count: 'exact' });
  
  console.log('whatsapp_chats:', t1.count, t1.error?.message);
  console.log('whatsapp_messages:', t2.count, t2.error?.message);
  console.log('donors:', t3.count, t3.error?.message);
}

checkAny();
