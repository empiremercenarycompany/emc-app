import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { sanitizePlayerValue } from "./book";
import { fixtureView, sirathFixtureAllowed } from "./fixture";
import { isFixtureCharacter } from "./source";
import type { SirathView } from "./types";

export async function loadSirathView(as: string | null | undefined, characterId: string | null): Promise<SirathView | null> {
  if (sirathFixtureAllowed() && isFixtureCharacter(as)) return fixtureView(as);
  if (sirathFixtureAllowed() && !characterId && !as) return fixtureView("ch-a1");
  if (!characterId) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("sirath_book", { p_character_id: characterId });
  if (error || !data || typeof data !== "object") return null;
  return sanitizePlayerValue(data) as SirathView;
}

export async function loadSirathBadge(characterId: string | null): Promise<number> {
  const headerList = await headers();
  const path = headerList.get("x-emc-path") ?? "";
  if (path.startsWith("/sirath")) return 0;
  const as = headerList.get("x-sirath-as");
  const view = sirathFixtureAllowed() && isFixtureCharacter(as) ? fixtureView(as) : null;
  const book =
    view ??
    (characterId
      ? await (async () => {
          const supabase = await createClient();
          if (!supabase) return null;
          const { data, error } = await supabase.rpc("sirath_book", { p_character_id: characterId });
          if (error || !data) return null;
          return sanitizePlayerValue(data) as SirathView;
        })()
      : null);
  if (!book?.home.latest_session) return 0;
  if (book.home && "badge_cleared" in book.home && (book.home as { badge_cleared?: boolean }).badge_cleared) return 0;
  const seen = (await cookies()).get("sirath_seen")?.value;
  if (seen === book.home.latest_session.id) return 0;
  return book.home.new_entry_ids?.length ?? 0;
}
