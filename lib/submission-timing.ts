import { regionalTime } from "../supabase/functions/_shared/submission-time";

export function submissionTiming(
  submittedAt: string,
  country: "AG" | "DM" = "AG",
) {
  const timestamp = Date.parse(submittedAt);
  if (!Number.isFinite(timestamp)) return null;
  // Both service regions use Atlantic Standard Time (UTC−4).
  return {
    submitted: regionalTime(new Date(timestamp), country),
    response: regionalTime(new Date(timestamp + 48 * 60 * 60 * 1000), country),
  };
}
