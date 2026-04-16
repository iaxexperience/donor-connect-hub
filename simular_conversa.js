import fetch from 'node-fetch';

const WEBHOOK_URL = "https://zljlhlfbtnzbmeaglkll.supabase.co/functions/v1/meta-whatsapp-proxy";

const fakePayload = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "893670633837138",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": { "display_phone_number": "558388533312", "phone_number_id": "123" },
            "contacts": [{ "profile": { "name": "Antigravity (AI Test)" }, "wa_id": "558388533312" }],
            "messages": [
              {
                "from": "558388533312",
                "id": `simulate_${Date.now()}`,
                "timestamp": Math.floor(Date.now() / 1000).toString(),
                "text": { "body": "Theo, sou eu o Antigravity. Se voce me ouvir, responda 'SISTEMA ONLINE'!" },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
};

async function testTheo() {
  console.log("🚀 Enviando simulação de mensagem para o Theo...");
  
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fakePayload)
    });

    if (res.ok) {
      console.log("✅ Sinal enviado para o Theo com sucesso! Aguardando 15 segundos para ele processar...");
      
      // Espera o Theo processar e responder
      setTimeout(async () => {
        console.log("\n🔍 Verificando se o Theo respondeu no banco de dados...");
        // Aqui chamamos o script de verificação que já temos
        const { exec } = await import('child_process');
        exec('node verificar_theo.js', (err, stdout, stderr) => {
          if (err) console.error(err);
          console.log(stdout);
        });
      }, 15000);
      
    } else {
      console.error(`❌ Erro no envio: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.error("Detalhes:", text);
    }
  } catch (err) {
    console.error("❌ Falha na conexão:", err.message);
  }
}

testTheo();
