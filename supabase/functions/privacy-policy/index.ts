import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Politica de Privacidade | Pulse Doacoes FAP</title>
  <style>body{font-family:Arial,sans-serif;max-width:820px;margin:40px auto;padding:0 20px;line-height:1.65;color:#172033}h1,h2{color:#0b63ce}small{color:#667085}</style>
</head>
<body>
  <h1>Politica de Privacidade</h1>
  <p><small>Ultima atualizacao: 18 de julho de 2026</small></p>
  <p>A Pulse Doacoes FAP utiliza dados pessoais somente para prestar atendimento, administrar doacoes e enviar comunicacoes relacionadas as suas atividades assistenciais.</p>
  <h2>Dados tratados</h2>
  <p>Podemos tratar nome, telefone, dados de contato, historico de atendimento e informacoes necessarias ao registro e acompanhamento de doacoes.</p>
  <h2>WhatsApp</h2>
  <p>As mensagens enviadas ou recebidas pelo WhatsApp podem ser registradas para atendimento, confirmacoes, recibos e acompanhamento do relacionamento com doadores. Nao comercializamos dados pessoais.</p>
  <h2>Compartilhamento e seguranca</h2>
  <p>Os dados podem ser processados por fornecedores essenciais de tecnologia, como Meta e provedores de infraestrutura, sempre de acordo com a finalidade do servico e medidas razoaveis de seguranca.</p>
  <h2>Direitos do titular</h2>
  <p>O titular pode solicitar acesso, correcao ou exclusao de seus dados, bem como deixar de receber comunicacoes, pelos canais oficiais da organizacao.</p>
  <h2>Retencao</h2>
  <p>As informacoes sao mantidas pelo periodo necessario para as finalidades descritas e para o cumprimento de obrigacoes legais e administrativas.</p>
  <h2>Contato</h2>
  <p>Solicitacoes sobre privacidade podem ser encaminhadas diretamente a Pulse Doacoes FAP por seus canais oficiais de atendimento.</p>
</body>
</html>`;

serve(() => new Response(html, {
  headers: {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "public, max-age=3600",
  },
}));
