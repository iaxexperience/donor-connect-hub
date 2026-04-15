import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgzOTEzMiwiZXhwIjoyMDkxNDE1MTMyfQ.3K_g1L-KOPPjI4tSg_vX8S7R-3-b5T-yT2e3zL6wH-I';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRecentLogs() {
  console.log("Fetching recent payment_logs:");
  const { data: logs, error } = await supabase
    .from('payments_logs')
    .select('created_at, event, payload')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) console.error("Error fetching logs:", error);
  else {
    logs.forEach(log => {
      console.log(`${log.created_at} - ${log.event} - Payment ID: ${log.payload?.payment?.id} - Customer: ${log.payload?.payment?.customer}`);
    });
  }

  // Check recent donations
  console.log("\nFetching recent donations:");
  const { data: donations, error: donError } = await supabase
    .from('donations')
    .select('id, amount, status, donation_date, confirmed_at, asaas_payment_id')
    .order('donation_date', { ascending: false })
    .limit(5);

  if (donError) console.error("Error fetching donations:", donError);
  else {
    donations.forEach(don => {
      console.log(`${don.donation_date} - Status: ${don.status} - Confirmed: ${don.confirmed_at} - Amount: ${don.amount} - Asaas ID: ${don.asaas_payment_id}`);
    });
  }
}

checkRecentLogs();
