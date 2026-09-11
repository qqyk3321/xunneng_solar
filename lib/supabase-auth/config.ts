export const supabasePublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function isSupabaseAuthConfigured() {
  return Boolean(supabasePublicUrl && supabasePublishableKey);
}
