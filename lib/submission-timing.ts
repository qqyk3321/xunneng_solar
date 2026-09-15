export function submissionTiming(submittedAt: string) {
  const timestamp = Date.parse(submittedAt);
  if (!Number.isFinite(timestamp)) return null;
  const format = (date: Date) => ({
    iso: date.toISOString(),
    date: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "America/Antigua",
    }).format(date),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Antigua",
    }).format(date),
  });
  // Both service regions use Atlantic Standard Time (UTC−4).
  return {
    submitted: format(new Date(timestamp)),
    response: format(new Date(timestamp + 48 * 60 * 60 * 1000)),
  };
}
