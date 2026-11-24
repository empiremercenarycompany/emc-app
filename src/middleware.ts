import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/update-session";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/privacy" || path === "/terms") {
    return NextResponse.redirect(`https://empiremercenarycompany.com${path}`, 308);
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|fonts/|sw.js).*)"],
};
