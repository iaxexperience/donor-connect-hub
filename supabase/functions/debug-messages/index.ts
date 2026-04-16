import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Pega os últimos chats
    const { data: chats, error: chatErr } = await supabase.from('whatsapp_chats').select('*').order('last_message_at', { ascending: false }).limit(10);

    // 2. Pega as últimas mensagens
    const { data: msgs, error: msgErr } = await supabase.from('whatsapp_messages').select('*').order('created_at', { ascending: false }).limit(30);

    const html = `
      <html>
        <head>
          <title>Diagnóstico Donor Connect</title>
          <style>
            body { font-family: sans-serif; padding: 20px; background: #f4f4f4; line-height: 1.6; }
            .container { max-width: 1000px; margin: auto; }
            h2 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; background: white; margin-bottom: 30px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; font-size: 13px; }
            th { background: #f8fafc; color: #64748b; }
            .bot { background: #eff6ff; }
            .error { color: #dc2626; background: #fee2e2; padding: 10px; border-radius: 5px; font-weight: bold; }
            .success-badge { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 99px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔍 Relatório de Diagnóstico WhatsApp</h1>
            
            ${chatErr ? `<p class="error">Erro ao ler chats: ${chatErr.message}</p>` : ''}
            <h2>Conversas Ativas</h2>
            <table>
              <tr><th>Telefone</th><th>Nome</th><th>Última Msg</th><th>Data</th></tr>
              ${chats?.map(c => `<tr>
                <td><strong>${c.telefone}</strong></td>
                <td>${c.nome || '-'}</td>
                <td>${c.last_message || '<i>Sem msg</i>'}</td>
                <td>${new Date(c.last_message_at).toLocaleString('pt-BR')}</td>
              </tr>`).join('') || '<tr><td colspan="4">Nenhum chat encontrado</td></tr>'}
            </table>

            ${msgErr ? `<p class="error">Erro ao ler mensagens: ${msgErr.message}</p>` : ''}
            <h2>Histórico de Mensagens (O Theo está aqui?)</h2>
            <table>
              <tr><th>Data</th><th>De/Para</th><th>Texto</th><th>Status</th><th>ID</th></tr>
              ${msgs?.map(m => `<tr class="${m.is_from_me ? 'bot' : ''}">
                <td>${new Date(m.created_at).toLocaleString('pt-BR')}</td>
                <td>${m.is_from_me ? '<span class="success-badge">Enviada pelo Robô</span>' : 'Recebida do Cliente'}</td>
                <td>${m.text_body}</td>
                <td>${m.status || '-'}</td>
                <td><small>${m.message_id?.substring(0, 10)}...</small></td>
              </tr>`).join('') || '<tr><td colspan="5">Nenhuma mensagem encontrada</td></tr>'}
            </table>
            
            <p>ℹ️ <i>Se as mensagens do Theo aparecerem em azul, o backend está perfeito e o problema é apenas na atualização da sua tela.</i></p>
          </div>
        </body>
      </html>
    `;

    return new Response(html, { 
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } 
    });

  } catch (err) {
    return new Response(`<h1>Erro Fatal: ${err.message}</h1>`, { status: 500 });
  }
});
