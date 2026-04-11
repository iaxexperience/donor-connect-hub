
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function probeFollowUps() {
  console.log("Checking follow_ups columns...");
  const commonCols = ['id', 'donor_id', 'due_date', 'status', 'note', 'created_at'];
  for (const col of commonCols) {
      const { error } = await supabase.from('follow_ups').select(col).limit(1);
      console.log(`Column '${col}': ${error ? 'NOT FOUND (' + error.message + ')' : 'FOUND'}`);
  }
}

probeFollowUps();
