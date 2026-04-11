
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function probeTriggers() {
  console.log("Probing for triggers on 'donations' table...");
  
  // We can't query information_schema directly via PostgREST 
  // unless we have an RPC or it's exposed. 
  // Let's try to query a common RPC or just use an error message to deduce.
  
  const { data, error } = await supabase.rpc('get_triggers', { t_name: 'donations' });
  
  if (error) {
    console.log("RPC 'get_triggers' not found (expected). Attempting to read trigger names via a known schema view if possible...");
    // Usually not possible without a custom function.
  } else {
    console.log("Triggers:", data);
  }

  // Fallback: Check if there's any file in the workspace explaining the triggers
}

probeTriggers();
