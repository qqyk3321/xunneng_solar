"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  accessCookieValue,
  passwordAccessMode,
  SOLAR_ACCESS_COOKIE,
} from "./access";

export async function unlockSolarAnalysis(formData: FormData) {
  const password = formData.get("password");
  const mode = typeof password === "string" ? passwordAccessMode(password) : null;

  if (!mode) {
    redirect("/solution-suggest?error=invalid_password");
  }

  const cookieStore = await cookies();
  cookieStore.set(SOLAR_ACCESS_COOKIE, accessCookieValue(mode), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/solution-suggest",
    maxAge: 60 * 60 * 12,
  });

  redirect("/solution-suggest");
}
