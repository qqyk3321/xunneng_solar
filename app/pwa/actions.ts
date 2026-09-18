"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PWA_ACCESS_COOKIE, pwaCookieValue, pwaPasswordIsValid } from "@/app/solar-analysis/access";

export async function unlockPwaDownload(data: FormData) {
  const password = data.get("password");
  if (typeof password !== "string" || !pwaPasswordIsValid(password)) redirect("/pwa?error=invalid_password");
  (await cookies()).set(PWA_ACCESS_COOKIE, pwaCookieValue(), {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
    path: "/pwa", maxAge: 60 * 60 * 12,
  });
  redirect("/pwa");
}
