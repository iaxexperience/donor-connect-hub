import { expect, test } from "vitest";
import { sendWhatsAppThankYou } from "../lib/whatsappService";

export const testWhatsAppPayload = async () => {
  console.log("Testing WhatsApp Payload Generation...");
  
  const donorName = "Teste Doador";
  const amount = 250.50;
  const phone = "5511999998888";
  const campaign = "Teste Automatizado";

  const payload = await sendWhatsAppThankYou(donorName, amount, phone, campaign);

  if (payload.template.name !== "agradecimento_doacao") {
    throw new Error("Template name mismatch");
  }

  if (payload.template.components[0].parameters[0].text !== donorName) {
    throw new Error("Donor name mismatch in parameters");
  }

  console.log("WhatsApp Payload Test Passed Successfully!");
  return true;
};

test("builds the WhatsApp thank-you template payload", async () => {
  await expect(testWhatsAppPayload()).resolves.toBe(true);
});
