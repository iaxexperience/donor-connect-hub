import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zljlhlfbtnzbmeaglkll.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamxobGZidG56Ym1lYWdsa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzkxMzIsImV4cCI6MjA5MTQxNTEzMn0.529dGG3ddHowpUnFmZu3qnbxWaleBAguRStF5GuUU3A';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function debugBB() {
    console.log("Fetching BB settings from DB...");
    const { data: bbSettings } = await supabase.from('bb_settings').select('*').eq('id', 1).maybeSingle();
    
    if (!bbSettings) return console.log("No BB settings found.");
    
    const { client_id, client_secret, app_key, sandbox } = bbSettings;
    console.log("Settings found. Sandbox:", sandbox);
    console.log("Client ID starts with:", client_id?.substring(0, 10));
    
    const credentials = btoa(`${client_id}:${client_secret}`);
    const tokenUrl = sandbox
      ? 'https://oauth.sandbox.bb.com.br/oauth/token'
      : 'https://oauth.bb.com.br/oauth/token';

    console.log("Requesting token from:", tokenUrl);
    
    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'gw-dev-app-key': app_key
            },
            body: new URLSearchParams({
                'grant_type': 'client_credentials',
                'scope': 'extrato.read'
            }).toString()
        });
        
        const raw = await response.text();
        console.log("Response Status:", response.status);
        console.log("Response Body:", raw);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

debugBB();
