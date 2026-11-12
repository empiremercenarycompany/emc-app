import { createHash } from "node:crypto";
import type { SirathSource } from "./types";

/** Stable namespace for slug → uuid. Not a secret. */
const NAMESPACE = Buffer.from("6f0e3c2a9b144d7e8a551c2b3d4e5f60", "hex");

/** UUID v5 so a slug always becomes the same id, and the slug never has to be stored on a player row. */
export function slugToUuid(slug: string): string {
  const hash = createHash("sha1").update(Buffer.concat([NAMESPACE, Buffer.from(slug, "utf8")])).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function rewriteSirathTokens(body: string, ids: ReadonlyMap<string, string>): string {
  return body.replace(/\{\{([a-z0-9-]+)\|([^}]*)\}\}/g, (match, id: string, label: string) => {
    const uuid = ids.get(id);
    if (!uuid) return match;
    return `{{${uuid}|${label}}}`;
  });
}

/**
 * Turn slug ids into uuids and rewrite inline links.
 * Staff fields stay off the player-shaped source the book builder sees.
 */
export function prepareCanon(source: SirathSource): SirathSource {
  const ids = new Map<string, string>();
  for (const entry of source.entries) ids.set(entry.id, entry.id.includes("-") && entry.id.length > 20 ? entry.id : slugToUuid(entry.id));
  for (const fact of source.facts) ids.set(fact.id, fact.id.includes("-") && fact.id.length > 20 ? fact.id : slugToUuid(`fact:${fact.id}`));
  const idOf = (slug: string) => ids.get(slug) ?? slug;
  return {
    ...source,
    entries: source.entries.map((entry) => ({
      ...entry,
      id: idOf(entry.id),
      faction_hint_entry_id: entry.faction_hint_entry_id ? idOf(entry.faction_hint_entry_id) : null,
      canon_refs: undefined,
      public_name_basis: undefined,
    })),
    facts: source.facts.map((fact) => ({
      ...fact,
      id: idOf(fact.id),
      entry_id: idOf(fact.entry_id),
      body: rewriteSirathTokens(fact.body, ids),
      canon_ref: undefined,
      skill_tag_reason: undefined,
    })),
    links: source.links.map((link) => ({
      ...link,
      id: link.id.includes("-") && link.id.length > 20 ? link.id : slugToUuid(`link:${link.id}`),
      from_entry_id: idOf(link.from_entry_id),
      to_entry_id: idOf(link.to_entry_id),
    })),
    reveals: source.reveals.map((reveal) => ({
      ...reveal,
      entry_id: reveal.entry_id ? idOf(reveal.entry_id) : null,
      fact_id: reveal.fact_id ? idOf(reveal.fact_id) : null,
    })),
    checks: source.checks.map((check) => ({
      ...check,
      entry_id: idOf(check.entry_id),
    })),
  };
}
