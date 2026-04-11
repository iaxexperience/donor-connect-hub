
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkLuciana() {
  console.log("Checking donations and data for Luciana Costa...");
  
  const { data: donor } = await supabase
    .from('donors')
    .select('*')
    .ilike('name', '%Luciana Costa%')
    .single();
    
  if (!donor) {
      console.log("Luciana not found.");
      return;
  }
  
  console.log("Donor Details:", { id: donor.id, name: donor.name, total: donor.total_donated, count: donor.donation_count });

  const { data: donations } = await supabase
    .from('donations')
    .select('*')
    .eq('donor_id', donor.id);
    
  console.log("Donations count from table:", donations.length);
  console.log("Donations individual amounts:", donations.map(d => d.amount));
}

checkLuciana();
