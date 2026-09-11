export type SubmissionSummary = {
  id: string;
  receivedAt: string | null;
  location: string | null;
  previewHref: string | null;
};

// Same order and validation as tally-webhook/buildConsultationPreviewUrl and
// submission-preview-test/splitCombinedId. Do not use the raw Tally URL here.
export function submissionPreviewHref(ids: unknown[]) {
  return ids.length === 3 &&
    ids.every((id) => typeof id === "string" && /^[A-Za-z0-9]{7}$/.test(id))
    ? `/submission-preview-test?id=${ids.join("")}`
    : null;
}

export function submissionLocation(value: unknown): string | null {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const location = value as Record<string, unknown>;
  if (typeof location.address === "string" && location.address.trim())
    return location.address.trim();
  const coordinate = (value: unknown) =>
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;
  const lat = coordinate(location.lat);
  const lng = coordinate(location.lng);
  return Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180
    ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    : null;
}

export function formatSubmissionTime(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Time unavailable";
  return (
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value)) + " UTC"
  );
}

export type SubmissionSort = {
  column: "receivedAt" | "location";
  direction: "asc" | "desc";
};

export function sortSubmissions(
  rows: SubmissionSummary[],
  sort: SubmissionSort,
) {
  return [...rows].sort((a, b) => {
    const left =
      sort.column === "receivedAt"
        ? a.receivedAt
          ? Date.parse(a.receivedAt)
          : NaN
        : a.location;
    const right =
      sort.column === "receivedAt"
        ? b.receivedAt
          ? Date.parse(b.receivedAt)
          : NaN
        : b.location;
    const missing = (value: unknown) =>
      value === null || (typeof value === "number" && !Number.isFinite(value));
    if (missing(left) !== missing(right)) return missing(left) ? 1 : -1;
    let result = 0;
    if (!missing(left) && !missing(right))
      result =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), "en", {
              sensitivity: "base",
              numeric: true,
            });
    return (
      (sort.direction === "asc" ? result : -result) ||
      a.id.localeCompare(b.id, "en", { numeric: true })
    );
  });
}
