// Global fetch in Node 18+

async function test() {
  const url = 'https://zljlhlfbtnzbmeaglkll.supabase.co/functions/v1/whatsapp-webhook';
  
  const payload = {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  from: '5583988533312', // Max's phone
                  id: 'test-message-id-' + Date.now(),
                  text: { body: 'Mensagem enviada via script de teste de webhook real!' },
                  type: 'text'
                }
              ],
              metadata: {
                display_phone_number: '5583988533312'
              }
            }
          }
        ]
      }
    ]
  };

  console.log("Sending test payload to webhook...");
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    console.log("Response Status:", response.status);
    console.log("Response Body:", text);
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

test();
