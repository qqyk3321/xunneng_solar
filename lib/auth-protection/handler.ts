import { isAuthAction, type AuthInput, type LimitDecision } from "./policy";

export type AuthOutcome = {
  authenticated?: boolean;
  error?: { code?: string; status?: number };
};
type Dependencies = {
  enabled: boolean;
  origin: string;
  checkLimit: (
    action: AuthInput["action"],
    email: string,
  ) => Promise<LimitDecision>;
  perform: (input: AuthInput, origin: string) => Promise<AuthOutcome>;
};

class RequestFailure extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function json(body: unknown, status = 200, retryAfter?: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
    },
  });
}

async function readInput(request: Request): Promise<AuthInput> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  ) {
    throw new RequestFailure(415, "Send a JSON request.");
  }
  if (Number(request.headers.get("content-length") ?? 0) > 4096) {
    throw new RequestFailure(413, "Request is too large.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestFailure(400, "Missing request body.");
  let text = "";
  let size = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        throw new RequestFailure(413, "Request is too large.");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    throw new RequestFailure(400, "Invalid JSON request.");
  }
  if (!body || typeof body !== "object" || !isAuthAction(body.action)) {
    throw new RequestFailure(400, "Unsupported authentication action.");
  }
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RequestFailure(400, "Enter a valid email address.");
  }
  if (body.action === "sign-in" || body.action === "sign-up") {
    if (
      typeof body.password !== "string" ||
      !body.password ||
      body.password.length > 1024
    ) {
      throw new RequestFailure(400, "Enter a valid password.");
    }
    if (
      body.action === "sign-up" &&
      (body.password.length < 8 || body.password !== body.confirmation)
    ) {
      throw new RequestFailure(
        400,
        "Use at least 8 characters and matching passwords.",
      );
    }
    return { action: body.action, email, password: body.password };
  }
  return { action: body.action, email };
}

export function createAuthHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (!deps.enabled)
      return json(
        { error: "This authentication prototype is local-only." },
        404,
      );
    if (request.method !== "POST")
      return json({ error: "Method not allowed." }, 405);
    // Configured origin, never an arbitrary redirect URL supplied by the client.
    // This also prevents cross-site login/registration CSRF with cookie sessions.
    if (
      request.headers.get("origin") !== deps.origin ||
      (request.headers.get("sec-fetch-site") &&
        request.headers.get("sec-fetch-site") !== "same-origin")
    ) {
      return json(
        { error: "Open the local authentication page to continue." },
        403,
      );
    }
    let input: AuthInput;
    try {
      input = await readInput(request);
    } catch (error) {
      return error instanceof RequestFailure
        ? json({ error: error.message }, error.status)
        : json({ error: "Could not read the request." }, 400);
    }

    let decision: LimitDecision;
    try {
      decision = await deps.checkLimit(input.action, input.email);
    } catch {
      return json(
        {
          error:
            "Account protection is temporarily unavailable. Please try again shortly.",
          code: "protection_unavailable",
          retryAfter: 10,
        },
        503,
        10,
      );
    }
    if (!decision.allowed) {
      return json(
        {
          error: "Too many attempts. Please wait before trying again.",
          code: "rate_limited",
          retryAfter: decision.retryAfter,
        },
        429,
        decision.retryAfter,
      );
    }
    try {
      const result = await deps.perform(input, deps.origin);
      if (result.error) {
        if (result.error.status === 429) {
          return json(
            {
              error: "Too many attempts. Please try again later.",
              code: "rate_limited",
              retryAfter: 60,
            },
            429,
            60,
          );
        }
        if (result.error.status && result.error.status >= 500) {
          return json(
            {
              error:
                "Authentication is temporarily unavailable. Please try again shortly.",
            },
            503,
          );
        }
        if (input.action === "sign-in") {
          return json(
            {
              error:
                "Unable to sign in. Check your email and password, and confirm your email if needed.",
            },
            401,
          );
        }
        // Never expose whether the destination email already belongs to an account.
        if (
          [
            "user_already_exists",
            "email_exists",
            "user_not_found",
            "email_not_confirmed",
          ].includes(result.error.code ?? "")
        ) {
          return json({ authenticated: false });
        }
        return json(
          {
            error:
              "Unable to complete this request. Check your details and try again.",
          },
          400,
        );
      }
      // No access token, refresh token, user record or raw provider error in JSON.
      return json({ authenticated: Boolean(result.authenticated) });
    } catch {
      return json(
        {
          error:
            "Authentication is temporarily unavailable. Please try again shortly.",
        },
        503,
      );
    }
  };
}
