const SUPABASE_URL = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

async function diagnose() {
  console.log("Chamando a função bb-fetch-transactions...");
  const res = await fetch(`${SUPABASE_URL}/functions/v1/bb-fetch-transactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response Body:", text);
}

diagnose();
