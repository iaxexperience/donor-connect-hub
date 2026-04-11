
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function finalCorrectMax() {
  console.log("Applying FINAL correction for Max Rangel Formiga (ID 2)...");
  
  const { data, error } = await supabase
    .from('donors')
    .update({ 
        total_donated: 850, 
        donation_count: 3,
        last_donation_date: '2026-04-11T14:52:15.659+00:00',
        type: 'esporadico'
    })
    .eq('id', 2)
    .select();
  
  if (error) {
    console.error("Correction failed:", error);
  } else {
    console.log("Correction applied successfully:", data);
  }
}

finalCorrectMax();
