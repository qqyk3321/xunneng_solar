type Environment = Record<string, string | undefined>;

/** Trust configured origins, never the client's Host / X-Forwarded-Host header. */
export function contactOrigins(env: Environment): string[] {
  const values = [env.SITE_URL];
  if (env.VERCEL === "1") {
    for (const host of [env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL]) {
      if (host) values.push(`https://${host}`);
    }
  }
  return values.flatMap((value) => {
    if (!value) return [];
    try {
      const url = new URL(value);
      if (url.username || url.password) return [];
      if (
        url.protocol !== "https:" &&
        !(env.NODE_ENV === "development" && url.protocol === "http:")
      )
        return [];
      return [url.origin];
    } catch {
      return [];
    }
  });
}

export function isContactOrigin(request: Request, env: Environment) {
  const origin = request.headers.get("origin");
  return Boolean(origin && contactOrigins(env).includes(origin));
}
