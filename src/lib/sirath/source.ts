import { readFileSync } from "node:fs";
import path from "node:path";
import type { SirathSource } from "./types";

let cached: SirathSource | null = null;

/** Server and tests only. The file is the canon seed and is not imported by client components. */
export function loadSirathSource(): SirathSource {
  if (cached) return cached;
  const file = path.join(process.cwd(), "supabase/seed/sirath_source.json");
  cached = JSON.parse(readFileSync(file, "utf8")) as SirathSource;
  return cached;
}

export const FIXTURE_CHARACTERS = ["ch-a1", "ch-a2", "ch-b1", "ch-r1"] as const;

export type FixtureCharacter = (typeof FIXTURE_CHARACTERS)[number];

export function isFixtureCharacter(value: string | null | undefined): value is FixtureCharacter {
  return FIXTURE_CHARACTERS.includes(value as FixtureCharacter);
}
