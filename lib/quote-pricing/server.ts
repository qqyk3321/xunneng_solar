import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { PricingSettings } from "./model";

function database() {
  const url = process.env.SUPABASE_URL?.trim(), key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("报价数据库尚未配置。");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) }) },
  });
}

export async function loadPricing() {
  const { data, error } = await database().from("quote_pricing_settings").select("*").eq("id", 1).single();
  if (error || !data) throw new Error("无法读取报价配置，请确认数据库迁移已完成后重试。");
  return data as PricingSettings;
}
