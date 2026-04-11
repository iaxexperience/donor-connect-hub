
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deepInvestigation() {
  console.log("Searching for ALL donations for Max Rangel Formiga...");
  
  // 1. Check for duplicate donors
  const { data: similarDonors } = await supabase.from('donors').select('id, name').ilike('name', '%MAX RANGEL%');
  console.log("Found similar donors:", similarDonors);
  
  const donorIds = similarDonors.map(d => d.id);
  
  // 2. Check for all donations for these IDs
  const { data: donations, error } = await supabase
    .from('donations')
    .select('*')
    .in('donor_id', donorIds);
  
  if (error) {
    console.error("Error fetching donations:", error);
  } else {
    console.log("All donations found:", donations);
    const sum = donations.reduce((acc, d) => acc + (d.amount || 0), 0);
    console.log("Actual Sum from DB:", sum);
  }
}

deepInvestigation();
