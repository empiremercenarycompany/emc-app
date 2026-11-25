import type { SupabaseClient } from "@supabase/supabase-js";
import { hallForApp, type PlacedSquad, type SaturdayTable } from "@/lib/rules/saturday-tables";

type BoardRow = {
  squad_id?: unknown;
  squad_name?: unknown;
  timeslot_id?: unknown;
  starts_on?: unknown;
  placed?: unknown;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Placed seats from characters assigned to a squad. Names only when the caller is signed in. */
export async function loadSaturdayHall(
  supabase: SupabaseClient,
  showNames: boolean,
): Promise<SaturdayTable[]> {
  const { data, error } = await supabase.rpc("saturday_table_board");
  if (error || !Array.isArray(data)) return hallForApp([], showNames);
  const squads: PlacedSquad[] = (data as BoardRow[]).map((row) => ({
    id: clean(row.squad_id),
    name: clean(row.squad_name),
    timeslotId: clean(row.timeslot_id),
    startsOn: clean(row.starts_on).slice(0, 10),
    placed: typeof row.placed === "number" ? row.placed : Number(row.placed ?? 0),
  }));
  return hallForApp(
    squads.filter((squad) => squad.timeslotId && squad.startsOn),
    showNames,
  );
}
