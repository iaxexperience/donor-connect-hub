
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMaxDonations() {
  console.log("Checking donations for donor id 2 (Max Rangel Formiga)...");
  const { data: donations, error } = await supabase
    .from('donations')
    .select('*')
    .eq('donor_id', 2);
  
  if (error) {
    console.error("Error fetching donations:", error);
  } else {
    console.log("Donations for Max:", donations);
    const total = donations.reduce((acc, d) => acc + (d.amount || 0), 0);
    const count = donations.length;
    console.log(`Calculated Total: ${total}, Count: ${count}`);
    
    // Check current state in donors table
    const { data: donor } = await supabase.from('donors').select('total_donated, donation_count').eq('id', 2).single();
    console.log("Current state in donors table:", donor);
  }
}

checkMaxDonations();
