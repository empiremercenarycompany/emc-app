import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { data, error } = await supabase.rpc("export_checkins");
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data ?? []);
}
