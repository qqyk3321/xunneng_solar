import type { NextRequest } from "next/server";
import { SOLAR_ACCESS_COOKIE } from "../access";
import { handleSolarVisit } from "@/lib/solar-analysis/visit-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleSolarVisit(request, request.cookies.get(SOLAR_ACCESS_COOKIE)?.value);
}
