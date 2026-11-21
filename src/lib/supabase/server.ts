import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "./env";

export async function createClient() {
  const env = publicEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // A Server Component cannot write cookies. Middleware refreshes the session.
        }
      },
    },
  });
}

/**
 * A user client for after(). The access token was read during the request.
 * This does not call cookies() and does not use the service role.
 */
export function createClientWithAccessToken(accessToken: string) {
  const env = publicEnv();
  if (!env) return null;
  return createSupabaseClient(env.url, env.key, {
    accessToken: async () => accessToken,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Server jobs that are not a signed-in user. The anon key only.
 * The service role never belongs in this app.
 */
export function createAnonClient() {
  const env = publicEnv();
  if (!env) return null;
  return createSupabaseClient(env.url, env.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
