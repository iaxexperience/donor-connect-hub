import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDuplicates() {
  console.log('--- Checking for duplicate chats/phones ---');
  const { data, error } = await supabase.from('whatsapp_chats').select('id, telefone, nome, last_message');
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Records found:', data.length);
    data.forEach(chat => {
      console.log(`ID: ${chat.id} | Phone: ${chat.telefone} | Name: ${chat.nome} | Last: ${chat.last_message}`);
    });
  }
}

checkDuplicates();
