import type { AuthAction } from "./policy";

export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly retryAfter = 0,
  ) {
    super(message);
    this.name = "AuthRequestError";
  }
}

export async function submitAuthAction(input: {
  action: AuthAction;
  email: string;
  password?: string;
  confirmation?: string;
}) {
  let response: Response;
  try {
    response = await fetch("/auth-preview/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify(input),
    });
  } catch {
    throw new AuthRequestError(
      "Could not connect. Check your connection and try again.",
    );
  }
  const body = (await response.json().catch(() => null)) as {
    authenticated?: boolean;
    error?: string;
    retryAfter?: number;
  } | null;
  if (!response.ok) {
    const raw = Number(
      response.headers.get("retry-after") ?? body?.retryAfter ?? 0,
    );
    const retryAfter = Number.isFinite(raw)
      ? Math.min(86400, Math.max(0, Math.ceil(raw)))
      : 0;
    throw new AuthRequestError(
      body?.error ?? "Unable to complete this request. Please try again.",
      retryAfter,
    );
  }
  if (!body || typeof body.authenticated !== "boolean") {
    throw new AuthRequestError("Unexpected response. Please try again.");
  }
  return body;
}
