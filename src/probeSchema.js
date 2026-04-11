
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getDetailedSchema() {
  console.log("Fetching detailed schema for 'donations'...");
  // Try to get columns via a failing query or just selecting everything from a view
  const { data, error } = await supabase.from('donations').select().limit(0);
  
  if (error) {
    console.error("Error fetching donations schema:", error);
  } else {
    // PostgREST sometimes returns headers with column info if we use CSV format or similar, 
    // but here we just want to see if we can get any info.
    console.log("Donations table accessed. Data length:", data.length);
  }

  // Let's try to find out columns by trial and error if needed, 
  // but first let's try to query the RPC if there is one for schema
  const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'donations' });
  if (colError) {
      console.log("RPC get_table_columns not found, trying common columns...");
      const commonCols = ['id', 'donor_id', 'amount', 'status', 'created_at', 'donation_date', 'campaign_id'];
      for (const col of commonCols) {
          const { error } = await supabase.from('donations').select(col).limit(1);
          console.log(`Column '${col}': ${error ? 'NOT FOUND (' + error.message + ')' : 'FOUND'}`);
      }
  } else {
      console.log("Donations columns:", cols);
  }
}

getDetailedSchema();
