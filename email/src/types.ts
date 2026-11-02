export type ConsultationSendPayload = {
  countryCode: "AG" | "DM";
  email: string;
  submissionId: string;
  previewUrl?: string | null;
  submittedAt: string;
  replyDeadline: string;
  supportEmail: string;
};

export function parseOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function splitEmails(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRegionalTimestamp(
  input: Date | string,
  country: "AG" | "DM",
): string {
  const date = input instanceof Date ? input : new Date(input);

  const timeZone = country === "AG" ? "America/Antigua" : "America/Dominica";
  const day = new Intl.DateTimeFormat("en-GB", {timeZone, day: "numeric", month: "short", year: "numeric"}).format(date).replace("Sept", "Sep");
  const time = new Intl.DateTimeFormat("en-US", {timeZone, hour: "numeric", minute: "2-digit", hour12: true}).format(date);
  return `${day} · ${time} AST`;
}
