import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Diagnóstico read-only: busca as credenciais atuais salvas em whatsapp_settings
// e testa cada uma delas direto na Graph API, retornando o erro cru da Meta.
// Não envia nenhuma mensagem — só faz GETs de leitura.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  const { data, error } = await supabase
    .from('whatsapp_settings')
    .select('waba_id, phone_number_id, access_token, updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Não encontrei a linha id=1 em whatsapp_settings.', details: error?.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = (data.access_token || '').trim();
  const eaaCount = (token.match(/EAA/g) || []).length;

  const tokenStructure = {
    length: token.length,
    eaa_count: eaaCount,
    starts_with: token.slice(0, 6),
    ends_with: token.slice(-6),
    looks_suspicious: token.length < 100 || eaaCount !== 1,
  };

  const graphGet = async (id: string, fields: string) => {
    if (!id) return { ok: false, error: 'ID não configurado.' };
    try {
      const res = await fetch(`https://graph.facebook.com/v22.0/${id}?fields=${fields}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      return { http_status: res.status, ok: res.ok && !json.error, body: json };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  };

  const [phoneResult, wabaResult] = await Promise.all([
    graphGet(data.phone_number_id, 'id,display_phone_number,verified_name,quality_rating'),
    graphGet(data.waba_id, 'id,name,message_template_namespace'),
  ]);

  return new Response(JSON.stringify({
    db_row: {
      waba_id: data.waba_id,
      phone_number_id: data.phone_number_id,
      updated_at: data.updated_at,
    },
    token_structure: tokenStructure,
    phone_number_check: phoneResult,
    waba_check: wabaResult,
  }, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
