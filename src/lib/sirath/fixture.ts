import { buildSirathView } from "./book";
import { isFixtureCharacter, loadSirathSource } from "./source";
import type { SirathView } from "./types";

/** Example books are a dev aid. Production reads sirath_book() for the signed-in character. */
export function sirathFixtureAllowed(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  if (process.env.NODE_ENV === "production") return false;
  return true;
}

export function fixtureView(characterId: string | null | undefined): SirathView | null {
  if (!sirathFixtureAllowed() || !isFixtureCharacter(characterId)) return null;
  return buildSirathView(loadSirathSource(), characterId);
}
