import { FIXTURE_SOURCE } from "./fixture-source";
import type { SirathSource } from "./types";

export const FIXTURE_CHARACTERS = ["ch-a1", "ch-b1", "ch-r1"] as const;

export type FixtureCharacter = (typeof FIXTURE_CHARACTERS)[number];

export function isFixtureCharacter(value: string | null | undefined): value is FixtureCharacter {
  return FIXTURE_CHARACTERS.includes(value as FixtureCharacter);
}

/** Dev and tests. The canon file is never read from the repo. */
export function loadSirathSource(): SirathSource {
  return FIXTURE_SOURCE;
}
