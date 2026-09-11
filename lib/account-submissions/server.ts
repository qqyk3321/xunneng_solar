import "server-only";
import {
  submissionLocation,
  submissionPreviewHref,
  type SubmissionSummary,
} from "./model";

type VerifiedUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  is_anonymous?: boolean;
};
type Dependencies = {
  getUser: () => Promise<{
    data: { user: VerifiedUser | null };
    error: { name?: string; status?: number } | null;
  }>;
  url?: string;
  authUrl?: string;
  serviceKey?: string;
  fetcher?: typeof fetch;
};
export type SubmissionsResult =
  | { kind: "signed-out" | "verify-email" | "error" }
  | { kind: "ready"; email: string; rows: SubmissionSummary[] };

// Anchored, escaped case-insensitive equality: existing Tally emails preserve
// case. Unlike ILIKE, imatch does not treat an email's %, _ or * as wildcards.
export function emailFilter(email: string) {
  return `imatch.^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
}

export async function loadAccountSubmissions(
  deps: Dependencies,
): Promise<SubmissionsResult> {
  try {
    const { data, error } = await deps.getUser();
    if (error)
      return {
        kind:
          error.name === "AuthSessionMissingError" ||
          error.status === 401 ||
          error.status === 403
            ? "signed-out"
            : "error",
      };
    if (!data.user) return { kind: "signed-out" };
    const user = data.user;
    // Use a fresh Auth user, not user_metadata or stale JWT email claims.
    if (
      !user.id ||
      user.is_anonymous ||
      !user.email_confirmed_at ||
      !user.email
    )
      return { kind: "verify-email" };
    const email = user.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { kind: "error" };
    if (
      !deps.url ||
      !deps.authUrl ||
      !deps.serviceKey ||
      new URL(deps.url).origin !== new URL(deps.authUrl).origin
    )
      return { kind: "error" };
    const fetcher = deps.fetcher ?? fetch;
    const rows: SubmissionSummary[] = [];
    let cursor = "0";
    // Retrieve ALL matches, not just the first REST page. Cursor pagination also
    // works if the server caps responses below the requested batch size.
    for (;;) {
      const url = new URL("/rest/v1/tally_form_submissions", deps.url);
      url.search = new URLSearchParams({
        select:
          "id::text,email,received_at,location_json,submission_id,response_id,respondent_id",
        email: emailFilter(email),
        id: `gt.${cursor}`,
        order: "id.asc",
        limit: "200",
      }).toString();
      const response = await fetcher(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
        headers: {
          apikey: deps.serviceKey,
          Authorization: `Bearer ${deps.serviceKey}`,
        },
      });
      if (!response.ok) return { kind: "error" };
      const batch: unknown = await response.json();
      if (!Array.isArray(batch)) return { kind: "error" };
      if (!batch.length) break;
      for (const row of batch) {
        if (
          !row ||
          typeof row !== "object" ||
          typeof row.email !== "string" ||
          row.email.toLowerCase() !== email
        )
          return { kind: "error" };
        const id = String(row.id);
        if (!/^[1-9]\d*$/.test(id) || BigInt(id) <= BigInt(cursor))
          return { kind: "error" };
        cursor = id;
        rows.push({
          id,
          receivedAt:
            typeof row.received_at === "string" ? row.received_at : null,
          location: submissionLocation(row.location_json),
          previewHref: submissionPreviewHref([
            row.submission_id,
            row.response_id,
            row.respondent_id,
          ]),
        });
      }
    }
    return { kind: "ready", email, rows };
  } catch {
    // Do not leak backend messages, credentials, or a partial list as complete.
    return { kind: "error" };
  }
}
