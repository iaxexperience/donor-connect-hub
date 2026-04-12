import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://zljlhlfbtnzbmeaglkll.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A'
)

async function run() {
  console.log("Fetching all received messages...");
  const { data: fetch, error: fetchErr } = await supabase.from('whatsapp_messages').select('*').eq('sender_id', 'them').order('created_at', { ascending: false }).limit(20);
  if (fetchErr) {
    console.error("Fetch failed:", fetchErr);
  } else {
    console.log(`Found ${fetch.length} received messages.`);
    console.dir(fetch, {depth: null});
  }
}
run();
