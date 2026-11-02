import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { tokenHash } from "@solortide/consultation-core/tokens";
import { consultationDatabase } from "./config";

const COOKIE = "st_consultation_device";
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
export async function managementDevice(create = false) {
  const existing = (await cookies()).get(COOKIE)?.value;
  return existing && tokenPattern.test(existing) ? existing : create ? randomBytes(32).toString("base64url") : null;
}
export function setManagementCookie(response: Response, token: string) {
  response.headers.append("Set-Cookie", `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7776000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
}
export async function grantManagement(id: string, device: string) {
  const { error } = await consultationDatabase().from("consultation_management_grants").upsert({
    consultation_id: id, token_hash: tokenHash(device), expires_at: new Date(Date.now() + 90 * 86400_000).toISOString(),
  });
  if (error) throw Error("Management access could not be saved");
}
export async function canManage(id: string) {
  const device = await managementDevice();
  if (!device) return false;
  const { data, error } = await consultationDatabase().from("consultation_management_grants").select("consultation_id")
    .eq("consultation_id", id).eq("token_hash", tokenHash(device)).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) throw Error("Management access unavailable");
  return !!data;
}
