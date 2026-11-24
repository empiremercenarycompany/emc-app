export function originFromHost(host: string | null, proto: string | null, fallback: string): string {
  const name = host?.split(",")[0]?.trim() ?? "";
  const scheme = proto?.split(",")[0]?.trim() ?? "";
  if (/^[a-z0-9.-]+(?::\d+)?$/i.test(name) && (scheme === "https" || scheme === "http")) return `${scheme}://${name}`;
  return fallback;
}

/** Prefer the public host Vercel forwards. Ignore a host that is not a hostname. */
export function appOrigin(request: Request): string {
  const url = new URL(request.url);
  return originFromHost(request.headers.get("x-forwarded-host"), request.headers.get("x-forwarded-proto"), url.origin);
}
