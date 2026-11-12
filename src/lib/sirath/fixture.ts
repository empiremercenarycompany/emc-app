import { buildSirathView } from "./book";
import { isFixtureCharacter, loadSirathSource } from "./source";
import type { SirathView } from "./types";

/** The striped viewer is a dev aid. A production build does not show it. */
export function sirathDevChrome(): boolean {
  return process.env.NODE_ENV !== "production" && !process.env.VERCEL_ENV;
}

/** Fake book for a local run, including `next start` on this machine. Never on Vercel or in CI. */
export function sirathFixtureAllowed(): boolean {
  return !process.env.VERCEL_ENV && !process.env.CI;
}

export function fixtureView(characterId: string | null | undefined): SirathView | null {
  if (!sirathFixtureAllowed() || !isFixtureCharacter(characterId)) return null;
  return buildSirathView(loadSirathSource(), characterId);
}
