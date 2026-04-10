import { toast } from "sonner";

export interface WhatsAppPayload {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: string;
  template: {
    name: string;
    language: { code: string };
    components: Array<{
      type: string;
      parameters: Array<{ type: string; text: string }>;
    }>;
  };
}

export const sendWhatsAppThankYou = async (donorName: string, amount: number, phone: string, campaign: string) => {
  const cleanPhone = phone.replace(/\D/g, "");
  
  const payload: WhatsAppPayload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "template",
    template: {
      name: "agradecimento_doacao",
      language: { code: "pt_BR" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: donorName },
            { type: "text", text: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount) },
          ]
        }
      ]
    }
  };

  // Simulation of API Call
  console.log("Sending WhatsApp Message to", cleanPhone, payload);
  
  // Log event in localStorage for the Integracoes page to show
  const logs = JSON.parse(localStorage.getItem("whatsapp_logs") || "[]");
  logs.unshift({
    id: Date.now(),
    time: new Date().toLocaleTimeString(),
    event: "message_sent",
    status: "success",
    to: cleanPhone,
    payload: JSON.stringify(payload, null, 2)
  });
  localStorage.setItem("whatsapp_logs", JSON.stringify(logs.slice(0, 50)));

  toast.success(`Agradecimento enviado para ${donorName} via WhatsApp!`, {
    description: `Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}`,
  });

  return payload;
};
