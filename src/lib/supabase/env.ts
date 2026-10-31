export type PublicEnv = { url: string; key: string };

/** Public client keys only. The service role never belongs in this app. */
export function publicEnv(): PublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export const MISSING_ENV =
  "Supabase is not configured. Copy .env.example to .env.local and add the project URL and anon key.";
