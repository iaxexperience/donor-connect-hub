
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function massRecalculate() {
  console.log("Starting mass recalculation of donor totals...");
  
  const { data: donors, error: donorsError } = await supabase.from('donors').select('id, name');
  if (donorsError) throw donorsError;

  for (const donor of donors) {
    const { data: donations } = await supabase
      .from('donations')
      .select('amount, donation_date')
      .eq('donor_id', donor.id);
    
    if (donations) {
      const total = donations.reduce((acc, d) => acc + (d.amount || 0), 0);
      const count = donations.length;
      const lastDate = donations.length > 0 ? 
        donations.sort((a, b) => new Date(b.donation_date).getTime() - new Date(a.donation_date).getTime())[0].donation_date : null;
      
      let type = 'lead';
      if (count === 1) type = 'unico';
      if (count >= 2) type = 'esporadico';
      // keep it recorrente if it was already? or use logic. Let's keep it simple.

      console.log(`Updating ${donor.name} (ID ${donor.id}): Total ${total}, Count ${count}`);
      await supabase.from('donors').update({
        total_donated: total,
        donation_count: count,
        last_donation_date: lastDate,
        type: type
      }).eq('id', donor.id);
    }
  }
  console.log("Mass recalculation finished.");
}

massRecalculate();
