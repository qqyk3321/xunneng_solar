import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ReverseGeocodeBody = { lat?: unknown; lng?: unknown };

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!apiKey) return NextResponse.json({ error: "Reverse geocoding is not configured." }, { status: 503 });

  let body: ReverseGeocodeBody;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const lat = typeof body.lat === "number" ? body.lat : Number(body.lat);
  const lng = typeof body.lng === "number" ? body.lng : Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "A valid latitude and longitude are required." }, { status: 400 });
  }

  const query = new URLSearchParams({ latlng: `${lat},${lng}`, key: apiKey, language: "zh-CN" });
  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${query}`, { cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: "Google Geocoding request failed." }, { status: 502 });
    const payload = await response.json() as { status?: string; results?: Array<{ formatted_address?: string; place_id?: string }> };
    const result = payload.results?.[0];
    if (payload.status !== "OK" || !result?.formatted_address) {
      return NextResponse.json({ error: "No address found for this location." }, { status: 404 });
    }
    return NextResponse.json({ address: result.formatted_address, placeId: result.place_id ?? "" });
  } catch {
    return NextResponse.json({ error: "Unable to reach Google Geocoding." }, { status: 502 });
  }
}
