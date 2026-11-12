import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "./env";

function requestHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-emc-path", request.nextUrl.pathname);
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production") {
    const as = request.nextUrl.searchParams.get("as");
    if (as && /^[a-z0-9-]+$/.test(as)) headers.set("x-sirath-as", as);
  }
  return headers;
}

export async function updateSession(request: NextRequest) {
  const headers = requestHeaders(request);
  const env = publicEnv();
  if (!env) return NextResponse.next({ request: { headers } });

  let response = NextResponse.next({ request: { headers } });
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request: { headers } });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}
