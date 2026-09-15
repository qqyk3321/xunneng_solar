/** Only embed the trusted Tally preview, never arbitrary webhook URLs. */
export function tallyPreviewUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.origin !== "https://tally.so" || url.username || url.password)
      return null;
    return url.href;
  } catch {
    return null;
  }
}
