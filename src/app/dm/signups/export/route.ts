import { redirect } from "next/navigation";
import { loadViewer } from "@/lib/company";
import { loadSignups, signupsCsv } from "@/lib/signups";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await loadViewer();
  if (!viewer.userId) redirect("/sign-in");
  if (!isStaff(viewer.role)) redirect("/");
  const supabase = await createClient();
  if (!supabase) {
    return new Response("Sign-ups could not be loaded.", { status: 503 });
  }
  const loaded = await loadSignups(supabase);
  if (loaded.error) {
    return new Response(loaded.error, { status: 503 });
  }
  return new Response(signupsCsv(loaded.rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="emc-signups.csv"',
      "Cache-Control": "no-store",
    },
  });
}
