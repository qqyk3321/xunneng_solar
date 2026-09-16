"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  accessCookieValue,
  passwordIsValid,
  SOLAR_ACCESS_COOKIE,
} from "./access";

export async function unlockSolarAnalysis(formData: FormData) {
  const password = formData.get("password");

  if (typeof password !== "string" || !passwordIsValid(password)) {
    redirect("/solar-analysis?error=invalid_password");
  }

  const cookieStore = await cookies();
  cookieStore.set(SOLAR_ACCESS_COOKIE, accessCookieValue(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/solar-analysis",
    maxAge: 60 * 60 * 12,
  });

  redirect("/solar-analysis");
}
