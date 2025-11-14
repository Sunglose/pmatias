import twilio from "twilio";
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function twWaSendText(toE164, body) {
    const to = toE164.startsWith("whatsapp:") ? toE164 : `whatsapp:${toE164}`;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    console.log("[Twilio WA] FROM:", from);
    console.log("[Twilio WA] TO:", to);

    return client.messages.create({ from, to, body });
}

// (opcional) normalizador simple para Chile
export function toE164CL(raw) {
    const digits = String(raw).replace(/\D/g, "");
    if (digits.startsWith("56")) return `+${digits}`;
    if (digits.length === 9) return `+56${digits}`;
    return null;
}
