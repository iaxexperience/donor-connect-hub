import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory token cache
let tokenCache: { token: string; expiresAt: number } | null = null;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Return cached token if still valid (with 60s buffer)
    if (tokenCache && Date.now() < tokenCache.expiresAt - 60000) {
      return new Response(JSON.stringify({ access_token: tokenCache.token }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = Deno.env.get('BB_CLIENT_ID');
    const clientSecret = Deno.env.get('BB_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('BB_CLIENT_ID e BB_CLIENT_SECRET não configurados nas variáveis de ambiente do Supabase.');
    }

    const credentials = btoa(`${clientId}:${clientSecret}`);
    const isSandbox = Deno.env.get('BB_SANDBOX') === 'true';
    const tokenUrl = isSandbox
      ? 'https://oauth.sandbox.bb.com.br/oauth/token'
      : 'https://oauth.bb.com.br/oauth/token';

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=extrato.read',
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(`BB OAuth Error: ${data.error_description || data.error || 'Unknown error'}`);
    }

    // Cache the token
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    // Log to Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('integration_logs').insert([{
      source: 'banco_brasil',
      event: 'token_obtained',
      payload: { expires_in: data.expires_in, token_type: data.token_type },
      status: 'success'
    }]).catch(() => {}); // Best-effort logging

    return new Response(JSON.stringify({ access_token: data.access_token, expires_in: data.expires_in }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[BB Token] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
