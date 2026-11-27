import { createAnonClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = { timeslot_id?: string; starts_on?: string; open?: number; full?: boolean };

/** Public counts only. No names and no emails. */
export async function GET() {
  const supabase = createAnonClient();
  if (!supabase) return Response.json({ tables: [] }, { status: 503 });
  const { data, error } = await supabase.rpc("saturday_availability");
  if (error || !Array.isArray(data)) return Response.json({ tables: [] }, { status: 503 });
  const tables = (data as Row[]).map((row) => ({
    timeslot_id: String(row.timeslot_id ?? ""),
    starts_on: String(row.starts_on ?? "").slice(0, 10),
    open: Math.max(0, Number(row.open ?? 0)),
    full: row.full === true,
  }));
  return Response.json({ tables });
}
