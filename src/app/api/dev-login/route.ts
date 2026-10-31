import { createClient as createAdminClient } from "@supabase/supabase-js";
import { devAccountEmail, devLoginAllowed } from "@/lib/dev-login";
import { publicEnv } from "@/lib/supabase/env";
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
  const env = publicEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !serviceKey) {
    return Response.json(
      {
        error:
          "Dev login did not open a session. Add SUPABASE_SERVICE_ROLE_KEY to .env.local on this machine. The shared password is not used. No mail was sent.",
      },
      { status: 503 },
    );
  }
  const admin = createAdminClient(env.url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const token = link.data?.properties?.hashed_token;
  if (link.error || !token) {
    return Response.json(
      {
        error: `Dev login did not open a session. ${link.error?.message ?? "No session token."} No mail was sent.`,
      },
      { status: 401 },
    );
  }
  const supabase = await createClient();
  if (!supabase) {
    return Response.json({ error: "Supabase is not configured. No mail was sent." }, { status: 503 });
  }
  const verified = await supabase.auth.verifyOtp({ token_hash: token, type: "magiclink" });
  if (verified.error) {
    return Response.json(
      { error: `Dev login did not open a session. ${verified.error.message} No mail was sent.` },
      { status: 401 },
    );
  }
  return Response.json({ ok: true });
}
