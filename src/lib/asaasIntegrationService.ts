import { toast } from "sonner";
import { sendWhatsAppThankYou } from "./whatsappService";
import { Donor } from "./donationService";

export interface AsaasPaymentEvent {
  id: string;
  event: "PAYMENT_CONFIRMED" | "PAYMENT_RECEIVED";
  payment: {
    id: string;
    customer: string;
    value: number;
    netValue: number;
    description: string;
    externalReference: string;
    billingType: string;
    confirmedDate: string;
    paymentDate: string;
    clientEmail?: string;
    clientName?: string;
    clientPhone?: string;
  };
}

export const handleAsaasDonation = async (
  event: AsaasPaymentEvent,
  findDonor: (email?: string, phone?: string) => Donor | undefined,
  registerDonor: (name: string, email: string, phone: string) => Donor,
  addDonation: (donorId: number, amount: number, campaign: string) => void
) => {
  const { payment } = event;
  const email = payment.clientEmail;
  const phone = payment.clientPhone;
  const name = payment.clientName || "Doador Asaas";
  const amount = payment.value;
  const campaign = payment.description || "Doação Geral Asaas";

  let donor = findDonor(email, phone);

  if (!donor) {
    console.log("Doador não encontrado. Criando novo registro para:", name);
    donor = registerDonor(name, email || "", phone || "");
  }

  // Register the donation
  addDonation(donor.id, amount, campaign);

  // Success Notification
  toast.success(`Doação recebida: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}`, {
    description: `Doador: ${donor.name} (via Asaas)`,
  });

  // Automatically send WhatsApp
  if (donor.phone) {
    await sendWhatsAppThankYou(donor.name, amount, donor.phone, campaign);
  }

  // Log the event for the Integracoes page
  const logs = JSON.parse(localStorage.getItem("asaas_logs") || "[]");
  logs.unshift({
    id: Date.now(),
    time: new Date().toLocaleTimeString(),
    type: "PAYMENT_RECEIVED",
    donor: donor.name,
    amount: amount,
    status: "processed"
  });
  localStorage.setItem("asaas_logs", JSON.stringify(logs.slice(0, 50)));
};

// Mock data generator for testing
export const generateMockAsaasEvent = (): AsaasPaymentEvent => {
  const names = ["Ricardo Oliveira", "Luciana Costa", "Marcos Viana", "Fernanda Souza"];
  const name = names[Math.floor(Math.random() * names.length)];
  return {
    id: `evt_${Math.random().toString(36).substr(2, 9)}`,
    event: "PAYMENT_RECEIVED",
    payment: {
      id: `pay_${Math.random().toString(36).substr(2, 9)}`,
      customer: `cus_${Math.random().toString(36).substr(2, 9)}`,
      value: Math.floor(Math.random() * 450) + 50,
      netValue: 0,
      description: "Campanha de Inverno",
      externalReference: "123",
      billingType: "PIX",
      confirmedDate: new Date().toISOString(),
      paymentDate: new Date().toISOString(),
      clientEmail: `${name.toLowerCase().replace(" ", ".")}@exemplo.com`,
      clientName: name,
      clientPhone: `55119${Math.floor(Math.random() * 90000000 + 10000000)}`
    }
  };
};
