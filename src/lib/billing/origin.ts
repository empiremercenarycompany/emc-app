/** Prefer the public host Vercel forwards. Ignore a host that is not a hostname. */
export function appOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "";
  if (/^[a-z0-9.-]+(?::\d+)?$/i.test(host) && (proto === "https" || proto === "http")) {
    return `${proto}://${host}`;
  }
  return url.origin;
}
