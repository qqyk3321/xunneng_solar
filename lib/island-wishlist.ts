import { validEmail } from "./anonymous-inquiry/config";
import { InquiryError } from "./anonymous-inquiry/handler";

export const WISHLIST_ISLANDS = {
  BB: "Barbados",
  LC: "Saint Lucia",
  GD: "Grenada",
  KN: "St. Kitts & Nevis",
  OTHER: "Other Caribbean island or territory",
} as const;
export type WishlistPayload = {
  email: string;
  islandCode: keyof typeof WISHLIST_ISLANDS;
  otherIsland: string;
};

export function parseWishlist(value: unknown): WishlistPayload {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InquiryError(400, "Please check your details.");
  const input = value as Record<string, unknown>;
  if (
    typeof input.email !== "string" ||
    typeof input.islandCode !== "string" ||
    !Object.hasOwn(WISHLIST_ISLANDS, input.islandCode)
  ) {
    throw new InquiryError(
      400,
      "Please select your island and enter a valid email address.",
    );
  }
  const email = input.email.trim().toLowerCase();
  if (!validEmail(email))
    throw new InquiryError(400, "Please enter a valid email address.");
  const islandCode = input.islandCode as WishlistPayload["islandCode"];
  const otherIsland =
    islandCode === "OTHER" && typeof input.otherIsland === "string"
      ? input.otherIsland.trim().replace(/\s+/g, " ").toLowerCase()
      : "";
  if (
    islandCode === "OTHER" &&
    (otherIsland.length < 2 ||
      otherIsland.length > 100 ||
      /[<>\x00-\x1f]/.test(otherIsland))
  ) {
    throw new InquiryError(
      400,
      "Please enter your island or territory (2–100 characters).",
    );
  }
  return { email, islandCode, otherIsland };
}

export function createWishlistHandler(deps: {
  origin: (request: Request) => boolean;
  limit: (request: Request) => Promise<void>;
  save: (payload: WishlistPayload) => Promise<void>;
  onError?: (error: unknown) => void;
}) {
  return async (request: Request) => {
    const reply = (body: unknown, status = 200, retryAfter?: number) =>
      Response.json(body, {
        status,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
        },
      });
    if (!deps.origin(request))
      return reply({ error: "Please submit from this website." }, 403);
    try {
      await deps.limit(request);
      if (
        request.headers.get("content-type")?.split(";")[0].trim() !==
        "application/json"
      )
        throw new InquiryError(415, "Please submit the form again.");
      if (Number(request.headers.get("content-length")) > 4096)
        throw new InquiryError(413, "Your request is too large.");
      const reader = request.body?.getReader();
      if (!reader) throw new InquiryError(400, "Please check your details.");
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        void reader.cancel().catch(() => undefined);
      }, 10_000);
      let size = 0;
      const chunks: Uint8Array[] = [];
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 4096) {
            await reader.cancel();
            throw new InquiryError(413, "Your request is too large.");
          }
          chunks.push(value);
        }
      } finally {
        clearTimeout(timer);
        reader.releaseLock();
      }
      if (timedOut) throw new InquiryError(408, "The request timed out. Please try again.");
      let input: unknown;
      try {
        input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        throw new InquiryError(400, "Please check your details.");
      }
      await deps.save(parseWishlist(input));
      // Identical response for first and repeat requests: never disclose membership.
      return reply({ ok: true });
    } catch (error) {
      if (error instanceof InquiryError && error.status < 500)
        return reply({ error: error.message }, error.status, error.retryAfter);
      deps.onError?.(error);
      return reply(
        { error: "We couldn’t save your request. Please try again shortly." },
        503,
      );
    }
  };
}
