/** Shared website/webhook formatter. Never use the browser/server local zone. */
export function regionalTime(input: string | Date, country: "AG" | "DM") {
  const date = input instanceof Date ? input : new Date(input);
  const timeZone = country === "AG" ? "America/Antigua" : "America/Dominica";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  const day = `${part("day")} ${part("month")?.replace("Sept", "Sep")} ${part("year")}`;
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return {
    iso: date.toISOString(),
    date: day,
    time,
    display: `${day} · ${time} AST`,
  };
}
