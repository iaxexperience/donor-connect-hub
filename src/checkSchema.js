
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log("Checking donors table...");
  const { data: donors, error: donorsError } = await supabase.from('donors').select('*').limit(1);
  if (donorsError) {
    console.error("Error fetching donors:", donorsError);
  } else {
    console.log("Donor columns:", donors.length > 0 ? Object.keys(donors[0]) : "No data");
    console.log("First donor sample:", donors[0]);
  }

  console.log("\nChecking donations table...");
  const { data: donations, error: donationsError } = await supabase.from('donations').select('*').limit(1);
  if (donationsError) {
    console.error("Error fetching donations:", donationsError);
  } else {
    console.log("Donation columns:", donations.length > 0 ? Object.keys(donations[0]) : "No data");
  }
}

checkSchema();
