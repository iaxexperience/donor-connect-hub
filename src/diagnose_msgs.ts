import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length === 2) {
        process.env[parts[0].trim()] = parts[1].trim();
      }
    });
  }
}

loadEnv();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function diagnose() {
  console.log('--- Advanced Message Diagnostic ---');
  
  // 1. Get exact messages for the specific phone number (all variations)
  const phones = ['5583988533312', '558388533312', '55555583988533312'];
  
  const { data: msgs, error: msgError } = await supabase
    .from('whatsapp_messages')
    .select('*, whatsapp_chats(telefone, nome)')
    .or(`telefone.in.(${phones.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (msgError) {
    console.error('Error fetching messages:', msgError);
    return;
  }

  console.log(`Found ${msgs.length} messages for target phone variations.`);
  
  msgs.forEach(m => {
    const direction = m.is_from_me ? 'OUT (Me)' : 'IN (Contact)';
    console.log(`[${m.created_at}] [Chat: ${m.whatsapp_chats?.telefone}] ${direction}: ${m.text_body} (Status: ${m.status})`);
  });

  // 2. Check for recent chats in the last 10 minutes
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recentChats } = await supabase
    .from('whatsapp_chats')
    .select('*')
    .gt('last_message_at', tenMinsAgo);

  console.log('\nChats updated in the last 10 minutes:');
  recentChats?.forEach(c => {
    console.log(`- [${c.id}] ${c.telefone} / ${c.nome}: "${c.last_message}" at ${c.last_message_at}`);
  });
}

diagnose();
