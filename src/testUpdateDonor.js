
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdateDonor() {
  console.log("Attempting to update donor id 2...");
  const { data, error } = await supabase
    .from('donors')
    .update({ total_donated: 1 })
    .eq('id', 2)
    .select();
  
  if (error) {
    console.error("UPDATE ERROR:", error);
  } else {
    console.log("UPDATE SUCCESS:", data);
  }
}

testUpdateDonor();
