import { createHmac, timingSafeEqual } from "node:crypto";

// Separate from the read-only preview token. Only customer emails contain this
// credential; it is scoped to one assessment and its current email address.
export function emailAccessToken(id: string, email: string, secret: string) {
  if (secret.length < 32) throw Error("Consultation token secret is not configured");
  return createHmac("sha256", secret).update(JSON.stringify(["consultation-email-edit/v1", id, email.trim().toLowerCase()])).digest("base64url");
}
export function validEmailAccess(token: string, id: string, email: string, secret: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token)
    && timingSafeEqual(Buffer.from(token), Buffer.from(emailAccessToken(id, email, secret)));
}
