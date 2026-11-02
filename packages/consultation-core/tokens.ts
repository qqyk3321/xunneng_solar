import { createHash, createHmac } from "node:crypto";
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
// A dedicated, stable secret makes lost-response retries reproducible without
// storing bearer links or coupling them to database credential rotation.
export function previewToken(id: string, secret: string) {
  if (secret.length < 32) throw Error("Consultation token secret is not configured");
  return createHmac("sha256", secret).update(`native-consultation/v1/${id}`).digest("base64url");
}
export function previewPath(id: string, country: string, secret: string) {
  if (country !== "AG" && country !== "DM") throw Error("Unsupported consultation region");
  return `/${country === "AG" ? "antigua" : "dominica"}/submission/${previewToken(id, secret)}`;
}
