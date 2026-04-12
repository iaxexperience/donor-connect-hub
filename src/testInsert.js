import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://zljlhlfbtnzbmeaglkll.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A'
)

async function run() {
  console.log("Checking donors to find a valid donor_id...");
  const { data: donors, error: Error } = await supabase.from('donors').select('*').limit(1);
  if (!donors || donors.length === 0) {
    console.log("No donors found.");
    return;
  }
  const donor = donors[0];
  console.log("Found donor:", donor.name);

  console.log("Trying to insert message as 'them'...");
  const { data: insertData, error: insertError } = await supabase.from('whatsapp_messages').insert([
    { donor_id: donor.id, sender_id: 'them', text: 'Mensagem de teste de recebimento', status: 'received' }
  ]).select();

  if (insertError) {
    console.error("Insert failed:", insertError);
  } else {
    console.log("Insert success:", insertData);
  }

  console.log("Fetching messages for this donor...");
  const { data: fetch, error: fetchErr } = await supabase.from('whatsapp_messages').select('*').eq('donor_id', donor.id);
  if (fetchErr) {
    console.error("Fetch failed:", fetchErr);
  } else {
    console.log("Fetched messages:", fetch.length);
    console.dir(fetch, {depth: null});
  }
}
run();
