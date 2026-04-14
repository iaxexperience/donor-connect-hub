import { createClient } from '@supabase/supabase-js';

const AS_KEY = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmRiODliMzVjLTVlZTYtNGEwYi1iMTAxLTI1NDQ1NjQ2ZTRlYzo6JGFhY2hfMzgwMjQwYTgtMTZjNC00YmMxLWFjZjUtNmFkM2YyMjJjODYy';

async function checkRealAsaas() {
  console.log("Checking real balance at Asaas...");
  
  try {
      const response = await fetch('https://api.asaas.com/v3/finance/balance', {
          headers: { 'access_token': AS_KEY }
      });
      const data = await response.json();
      console.log("REAL ASAS BALANCE:", data);
      
      if (response.ok) {
          // Save to DB
          const SUPABASE_URL = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
          const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';
          const supabase = createClient(SUPABASE_URL, ANON_KEY);
          
          console.log("Saving key to database...");
          const { error } = await supabase.from('asaas_settings').upsert([{ 
              id: 1, 
              api_key: AS_KEY, 
              sandbox: false, // It's a prod key
              updated_at: new Date().toISOString() 
          }]);
          
          if (error) console.error("Database save error:", error);
          else console.log("Key saved successfully!");
      } else {
          console.error("API Error:", data);
      }
  } catch (err) {
      console.error("Fetch error:", err);
  }
}

checkRealAsaas();
