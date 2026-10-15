/** Shared public contact default; senders may override it with WHATSAPP_BASE_URL. */
export const DEFAULT_WHATSAPP_BASE_URL = "https://wa.me/8617605886812";

export function consultationWhatsAppUrl(submissionId: string, baseUrl = DEFAULT_WHATSAPP_BASE_URL): string {
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(submissionId)) throw new Error("Invalid WhatsApp submission reference");
  const base = baseUrl.trim();
  // Keep the destination a WhatsApp phone link; text is always generated here.
  if (!/^https:\/\/wa\.me\/[1-9]\d{5,14}\/?$/.test(base)) throw new Error("Invalid WHATSAPP_BASE_URL");
  const message = `Hi Sol & Tide, I'd like to discuss my preliminary quote.\nSubmission ID: ${submissionId}`;
  return `${base.replace(/\/$/, "")}?text=${encodeURIComponent(message).replace(/'/g, "%27")}`;
}
