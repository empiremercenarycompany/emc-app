import { createHash } from "node:crypto";
import type { SirathSource } from "./types";

/** Used only by the fake test book. The staff loader requires SIRATH_UUID_NAMESPACE and rejects this value. */
export const DEV_FIXTURE_NAMESPACE = "sirath-dev-fixture";

/** UUID v5. Pass the namespace in. A published constant must not name production rows. */
export function slugToUuid(slug: string, namespace: string): string {
  const hash = createHash("sha1")
    .update(Buffer.concat([Buffer.from(namespace, "utf8"), Buffer.from(slug, "utf8")]))
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function rewriteSirathTokens(body: string, ids: ReadonlyMap<string, string>): string {
  return body.replace(/\{\{([a-z0-9-]+)\|([^}]*)\}\}/g, (_match, id: string, label: string) => {
    const uuid = ids.get(id);
    if (!uuid) throw new Error(`Unknown slug in a link: ${id}`);
    return `{{${uuid}|${label}}}`;
  });
}

function looksUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Turn slug ids into uuids and rewrite inline links.
 * An unknown slug is an error, not a smudge.
 */
export function prepareCanon(source: SirathSource, namespace: string = DEV_FIXTURE_NAMESPACE): SirathSource {
  const entryIds = new Map<string, string>();
  for (const entry of source.entries) {
    entryIds.set(entry.id, looksUuid(entry.id) ? entry.id : slugToUuid(entry.id, namespace));
  }
  const factIds = new Map<string, string>();
  for (const fact of source.facts) {
    factIds.set(fact.id, looksUuid(fact.id) ? fact.id : slugToUuid(`fact:${fact.id}`, namespace));
  }
  const idOf = (slug: string, map: ReadonlyMap<string, string>) => {
    const found = map.get(slug) ?? (looksUuid(slug) ? slug : undefined);
    if (!found) throw new Error(`Unknown slug: ${slug}`);
    return found;
  };
  return {
    ...source,
    entries: source.entries.map((entry) => ({
      ...entry,
      id: idOf(entry.id, entryIds),
      faction_hint_entry_id: entry.faction_hint_entry_id ? idOf(entry.faction_hint_entry_id, entryIds) : null,
      canon_refs: undefined,
      public_name_basis: undefined,
    })),
    facts: source.facts.map((fact) => ({
      ...fact,
      id: idOf(fact.id, factIds),
      entry_id: idOf(fact.entry_id, entryIds),
      body: rewriteSirathTokens(fact.body, entryIds),
      canon_ref: undefined,
      skill_tag_reason: undefined,
    })),
    links: source.links.map((link) => ({
      ...link,
      id: looksUuid(link.id) ? link.id : slugToUuid(`link:${link.id}`, namespace),
      from_entry_id: idOf(link.from_entry_id, entryIds),
      to_entry_id: idOf(link.to_entry_id, entryIds),
    })),
    reveals: source.reveals.map((reveal) => ({
      ...reveal,
      entry_id: reveal.entry_id ? idOf(reveal.entry_id, entryIds) : null,
      fact_id: reveal.fact_id ? idOf(reveal.fact_id, factIds) : null,
    })),
    checks: source.checks.map((check) => ({
      ...check,
      entry_id: idOf(check.entry_id, entryIds),
    })),
  };
}
