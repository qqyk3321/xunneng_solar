import { createGeocodeHandler } from "@/lib/server-geocode";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createGeocodeHandler(process.env);
