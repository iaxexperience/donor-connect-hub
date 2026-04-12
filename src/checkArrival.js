import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://zljlhlfbtnzbmeaglkll.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A'
)

async function run() {
  console.log("Checking for ANY received messages in last 5 minutes...");
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const { data: fetch, error: fetchErr } = await supabase
    .from('whatsapp_messages')
    .select('*, donors(name)')
    .eq('sender_id', 'them')
    .gt('created_at', fiveMinAgo)
    .order('created_at', { ascending: false });
  
  if (fetchErr) {
    console.error("Fetch failed:", fetchErr);
  } else {
    console.log(`Found ${fetch.length} messages in last 5 mins.`);
    console.dir(fetch, {depth: null});
  }

  console.log("Checking integration_logs for whatsapp events...");
  const { data: logs, error: logErr } = await supabase
    .from('integration_logs')
    .select('*')
    .ilike('event', '%whatsapp%')
    .gt('created_at', fiveMinAgo)
    .order('created_at', { ascending: false });

  if (!logErr && logs) {
     console.log(`Found ${logs.length} logs.`);
     console.dir(logs, {depth: null});
  }
}
run();
