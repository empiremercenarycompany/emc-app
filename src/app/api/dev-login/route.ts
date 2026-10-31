import { DEV_LOGIN_PASSWORD, devAccountEmail, devLoginAllowed } from "@/lib/dev-login";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const host = request.headers.get("host");
  if (!devLoginAllowed(process.env.NEXT_PUBLIC_DEV_LOGIN, host)) {
    return new Response(null, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = devAccountEmail(body?.email ?? "");
  if (!email) {
    return Response.json({ error: "That test account is not on the roster." }, { status: 400 });
  }
  const supabase = await createClient();
  if (!supabase) {
    return Response.json({ error: "Supabase is not configured. No mail was sent." }, { status: 503 });
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password: DEV_LOGIN_PASSWORD });
  if (error) {
    return Response.json({ error: "Dev login was refused. No mail was sent." }, { status: 401 });
  }
  return Response.json({ ok: true });
}
