import { cookies } from "next/headers";
import { SOLAR_ACCESS_COOKIE } from "../access";
import { handleModelRequest } from "@/lib/solar-analysis/model-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return handleModelRequest(request, (await cookies()).get(SOLAR_ACCESS_COOKIE)?.value);
}
