
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function finalVerification() {
  console.log("Final Verification: Testing full insert with payment_method...");
  // Note: This assumes the user ran the SQL to allow follow_ups insert as well
  const { data, error } = await supabase
    .from('donations')
    .insert([{
      donor_id: 2,
      amount: 150,
      payment_method: 'Pix',
      status: 'pago',
      donation_date: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error("FINAL ERROR:", error.code, ":", error.message);
    if (error.code === '42501' && error.message.includes('follow_ups')) {
        console.log("HINT: This confirms RLS is still blocking 'follow_ups'. Running the SQL script will fix this.");
    }
  } else {
    console.log("FINAL SUCCESS! Inserted data:", data);
  }
}

finalVerification();
