
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugInsertV4() {
  console.log("Variante 4: Com payment_method...");
  const { error: e4 } = await supabase
    .from('donations')
    .insert([{ 
        donor_id: 2, 
        amount: 50, 
        payment_method: 'Dinheiro',
        status: 'pago',
        donation_date: new Date().toISOString() 
    }])
    .select();
  
  if (e4) {
      console.log("V4 Error:", e4.code, ":", e4.message);
      if (e4.details) console.log("Details:", e4.details);
  } else {
      console.log("V4 SUCCESS!");
  }
}

debugInsertV4();
