import {
  emptyPublicAvailability,
  publicAvailabilityFromRows,
  publicAvailabilityHeaders,
} from "@/lib/rules/public-availability";
import { createAnonClient } from "@/lib/supabase/server";

type Row = { timeslot_id?: string; open?: number };

function originOf(request: Request): string | null {
  return request.headers.get("origin");
}

/** No login. Counts only, keyed by the site's morning / afternoon / evening values. */
export async function GET(request: Request) {
  const supabase = createAnonClient();
  if (!supabase) {
    return Response.json(emptyPublicAvailability(), { status: 503, headers: publicAvailabilityHeaders(originOf(request), false) });
  }
  const { data, error } = await supabase.rpc("saturday_availability");
  if (error || !Array.isArray(data)) {
    return Response.json(emptyPublicAvailability(), { status: 503, headers: publicAvailabilityHeaders(originOf(request), false) });
  }
  const body = publicAvailabilityFromRows(data as Row[]);
  return Response.json(body, { headers: publicAvailabilityHeaders(originOf(request), true) });
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicAvailabilityHeaders(originOf(request), true) });
}
