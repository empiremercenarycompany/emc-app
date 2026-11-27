import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/billing/origin";
import { resumeSiteCheckout } from "@/lib/billing/resume-site-checkout";
import { readResumeToken, resumeRateAllows } from "@/lib/billing/resume-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function neutral(origin: string, canceled: boolean) {
  const url = new URL("/pay", origin);
  if (canceled) url.searchParams.set("canceled", "1");
  return NextResponse.redirect(url, 303);
}

/** Token only. A raw email never opens a session and never changes this response. */
async function openFromToken(request: Request, token: string) {
  const origin = appOrigin(request);
  const canceled = new URL(request.url).searchParams.get("canceled") === "1";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!resumeRateAllows(`${ip}:${token.slice(0, 12)}`)) return neutral(origin, canceled);
  const email = readResumeToken(token);
  if (!email) return neutral(origin, canceled);
  const result = await resumeSiteCheckout(email, origin);
  if (result.state === "url") return NextResponse.redirect(result.url, 303);
  return neutral(origin, canceled);
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return openFromToken(request, token);
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");
  return openFromToken(request, token);
}
