import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Pega os últimos chats
    const { data: chats } = await supabase.from('whatsapp_chats').select('*').order('last_message_at', { ascending: false }).limit(5);

    // 2. Pega as últimas mensagens
    const { data: msgs } = await supabase.from('whatsapp_messages').select('*').order('created_at', { ascending: false }).limit(20);

    const html = `
      <html>
        <head>
          <title>Diagnóstico Donor Connect</title>
          <style>
            body { font-family: sans-serif; padding: 20px; background: #f4f4f4; }
            h2 { color: #333; }
            table { width: 100%; border-collapse: collapse; background: white; margin-bottom: 30px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #eee; }
            .bot { background: #e3f2fd; }
          </style>
        </head>
        <body>
          <h1>Relatório de Diagnóstico Real-Time</h1>
          
          <h2>Chats Recentes (Para conferir IDs e Telefones)</h2>
          <table>
            <tr><th>ID</th><th>Telefone</th><th>Nome</th><th>Última Msg</th><th>Data</th></tr>
            ${chats?.map(c => `<tr><td>${c.id}</td><td>${c.telefone}</td><td>${c.nome}</td><td>${c.last_message}</td><td>${c.last_message_at}</td></tr>`).join('')}
          </table>

          <h2>Últimas 20 Mensagens (O Theo deve estar aqui!)</h2>
          <table>
            <tr><th>Data</th><th>Chat ID</th><th>Telefone</th><th>Texto</th><th>Enviada por Mim?</th><th>ID Mensagem</th></tr>
            ${msgs?.map(m => `<tr class="${m.is_from_me ? 'bot' : ''}">
              <td>${m.created_at}</td><td>${m.chat_id}</td><td>${m.telefone}</td><td>${m.text_body}</td><td>${m.is_from_me}</td><td>${m.message_id}</td>
            </tr>`).join('')}
          </table>
          <p>Se as mensagens do Theo aparecerem em azul, o banco está funcionando e o problema é na tela.</p>
        </body>
      </html>
    `;

    return new Response(html, { 
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
