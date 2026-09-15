import "server-only";

type KeepaliveEnvironment = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export async function querySupabaseKeepalive(
  environment: KeepaliveEnvironment = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  fetcher: typeof fetch = fetch,
) {
  const supabaseUrl = environment.SUPABASE_URL?.trim();
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase keepalive is not configured");
  }

  const requestUrl = new URL("/rest/v1/tally_form_submissions", supabaseUrl);
  requestUrl.search = new URLSearchParams({
    select: "id",
    limit: "1",
  }).toString();

  const response = await fetcher(requestUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase keepalive failed with status ${response.status}`);
  }
}
