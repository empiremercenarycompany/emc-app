import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeSignupEmail } from "@/lib/billing/site-checkout";

const TTL_SECONDS = 7 * 24 * 60 * 60;

export function resumeSecret(): string | null {
  const value = process.env.EMC_CHECKOUT_RESUME_SECRET?.trim() || process.env.EMC_STRIPE_WEBHOOK_SECRET?.trim();
  return value ? value : null;
}

/** Opaque cancel/resume token. The email is inside the signature, not in the query as metadata. */
export function signResumeToken(email: string, now = Date.now()): string | null {
  const secret = resumeSecret();
  const normalized = normalizeSignupEmail(email);
  if (!secret || !normalized) return null;
  const body = Buffer.from(
    JSON.stringify({ e: normalized, exp: Math.floor(now / 1000) + TTL_SECONDS }),
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readResumeToken(token: string | null | undefined, now = Date.now()): string | null {
  const secret = resumeSecret();
  if (!secret || !token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { e?: unknown; exp?: unknown };
    if (typeof parsed.e !== "string" || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Math.floor(now / 1000)) return null;
    return normalizeSignupEmail(parsed.e);
  } catch {
    return null;
  }
}

const hits = new Map<string, number[]>();

/** True when the caller is still inside the window. In-memory, per server process. */
export function resumeRateAllows(key: string, now = Date.now(), limit = 8, windowMs = 10 * 60 * 1000): boolean {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
