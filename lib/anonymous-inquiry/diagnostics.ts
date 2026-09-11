/** Only allowlisted metadata may reach logs. Never retain SDK messages or causes. */
export type ContactStage =
  | "upstash.config"
  | "upstash.limit"
  | "supabase.config"
  | "supabase.lookup"
  | "supabase.upload"
  | "supabase.insert"
  | "supabase.request"
  | "request";
export class ContactFailure extends Error {
  constructor(
    readonly stage: ContactStage,
    readonly reason: string,
    readonly providerStatus?: number,
    readonly providerCode?: string,
  ) {
    super("Contact dependency failed");
  }
}

export function dependencyFailure(stage: ContactStage, error: unknown) {
  if (error instanceof ContactFailure) return error;
  const value =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : {};
  const rawStatus = Number(value.status ?? value.statusCode);
  const status =
    Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599
      ? rawStatus
      : undefined;
  const code =
    typeof value.code === "string" &&
    /^(?:PGRST\d{3}|\d{5}|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND)$/.test(
      value.code,
    )
      ? value.code
      : undefined;
  // Inspect text only to classify. The text itself is never stored or logged.
  const message = typeof value.message === "string" ? value.message : "";
  const reason = /timeout|timed out|aborted/i.test(message)
    ? "timeout"
    : status === 401 ||
        status === 403 ||
        /unauthorized|forbidden|invalid.*(?:token|key)|WRONGPASS|NOPERM/i.test(
          message,
        )
      ? "credentials_or_permissions"
      : /fetch failed|network|ENOTFOUND|ECONN/i.test(message)
        ? "network"
        : "dependency_error";
  return new ContactFailure(stage, reason, status, code);
}

export function contactFailureLog(
  error: unknown,
  requestId: string,
  env: Record<string, string | undefined>,
) {
  const failure = dependencyFailure("request", error);
  return {
    event: "contact_submission_failed",
    requestId,
    stage: failure.stage,
    reason: failure.reason,
    providerStatus: failure.providerStatus,
    providerCode: failure.providerCode,
    configured: {
      upstashUrl: Boolean(env.UPSTASH_REDIS_REST_URL?.trim()),
      upstashToken: Boolean(env.UPSTASH_REDIS_REST_TOKEN?.trim()),
      supabaseUrl: Boolean(env.SUPABASE_URL?.trim()),
      supabaseServiceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    },
  };
}
