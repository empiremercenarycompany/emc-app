/**
 * Staff seed for The Sirath. Reads canon JSON from outside this repo and upserts it.
 * Refuses a path inside the repo and refuses a hosted Supabase URL.
 *
 *   SIRATH_SOURCE=/secure/sirath_source.json DATABASE_URL=postgres://... npm run seed:sirath
 *   npm run seed:sirath -- --file /secure/sirath_source.json --guild <uuid>
 *
 * Bodies go to story_fact_text. Canon refs go to story_fact_staff.
 * Example characters, reveals, and checks in the file are not inserted.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { slugToUuid } from "../src/lib/sirath/ids";

type Row = Record<string, unknown>;

function arg(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function quote(value: unknown): string {
  if (value == null) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    if (value.length === 0) return "'{}'";
    return `array[${value.map((item) => quote(item)).join(",")}]::text[]`;
  }
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const tag = `$sirath_${Math.random().toString(16).slice(2)}$`;
  return `${tag}${text}${tag}`;
}

function main() {
  const fileArg = arg("--file") ?? process.env.SIRATH_SOURCE;
  if (!fileArg) fail("Pass --file or set SIRATH_SOURCE to a canon JSON path outside the repo.");
  const file = path.resolve(fileArg);
  const root = path.resolve(process.cwd());
  if (file === root || file.startsWith(root + path.sep)) {
    fail("Refusing a canon file inside the repo.");
  }
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl) fail("Set DATABASE_URL to a local database.");
  if (/supabase\.(co|com)/i.test(databaseUrl)) fail("Refusing a hosted Supabase URL.");

  const raw = JSON.parse(readFileSync(file, "utf8")) as {
    rules?: { culture_language?: Record<string, string> };
    entries?: Row[];
    facts?: Row[];
    links?: Row[];
  };
  const entries = raw.entries ?? [];
  const facts = raw.facts ?? [];
  const links = raw.links ?? [];
  const entryId = new Map(entries.map((entry) => [String(entry.id), slugToUuid(String(entry.id))]));
  const factId = new Map(facts.map((fact) => [String(fact.id), slugToUuid(`fact:${String(fact.id)}`)]));
  const rewrite = (body: string) =>
    body.replace(/\{\{([a-z0-9-]+)\|([^}]*)\}\}/g, (match, id: string, label: string) => {
      const uuid = entryId.get(id);
      return uuid ? `{{${uuid}|${label}}}` : match;
    });

  const guild = arg("--guild");
  const guildSql = guild ? quote(guild) : `(select id from public.guilds where slug = 'emc' limit 1)`;
  const statements: string[] = ["begin;"];
  if (raw.rules?.culture_language) {
    statements.push(
      `update public.story_rules set culture_language = ${quote(JSON.stringify(raw.rules.culture_language))}::jsonb where id = 1;`,
    );
  }
  for (const entry of entries) {
    const id = entryId.get(String(entry.id));
    statements.push(`insert into public.story_entries (id, guild_id, kind, display_name, aliases, tags, hearsay, voice_line, image, ward, public_name, editorial_status)
      values (${quote(id)}, ${guildSql}, ${quote(entry.kind)}, ${quote(entry.display_name)}, ${quote(entry.aliases ?? [])}, ${quote(entry.tags ?? [])}, ${quote(entry.hearsay ?? "")}, ${quote(entry.voice_line ?? "")}, ${entry.image ? `${quote(JSON.stringify(entry.image))}::jsonb` : "null"}, ${quote(entry.ward ?? null)}, ${quote(Boolean(entry.public_name))}, ${quote(entry.editorial_status ?? "draft")})
      on conflict (id) do update set display_name = excluded.display_name, aliases = excluded.aliases, tags = excluded.tags, hearsay = excluded.hearsay, voice_line = excluded.voice_line, image = excluded.image, ward = excluded.ward, public_name = excluded.public_name, editorial_status = excluded.editorial_status, updated_at = now();`);
    statements.push(`insert into public.story_entries_dm (entry_id, public_name_basis, canon_refs, slug)
      values (${quote(id)}, ${quote(entry.public_name_basis ?? null)}, ${quote(entry.canon_refs ?? [])}, ${quote(entry.id)})
      on conflict (entry_id) do update set public_name_basis = excluded.public_name_basis, canon_refs = excluded.canon_refs, slug = excluded.slug;`);
  }
  for (const entry of entries) {
    if (!entry.faction_hint_entry_id) continue;
    statements.push(
      `update public.story_entries set faction_hint_id = ${quote(entryId.get(String(entry.faction_hint_entry_id)) ?? null)} where id = ${quote(entryId.get(String(entry.id)))};`,
    );
  }
  for (const fact of facts) {
    const id = factId.get(String(fact.id));
    statements.push(`insert into public.story_fact_public (id, guild_id, entry_id, tier, skill, culture_key, dc, dc_is_placeholder, teaser, editorial_status)
      values (${quote(id)}, ${guildSql}, ${quote(entryId.get(String(fact.entry_id)) ?? null)}, ${quote(fact.tier)}, ${quote(fact.skill ?? null)}, ${quote(fact.culture_id ?? null)}, ${quote(fact.dc ?? null)}, ${quote(Boolean(fact.dc_is_placeholder))}, ${quote(fact.teaser ?? null)}, ${quote(fact.editorial_status ?? "draft")})
      on conflict (id) do update set tier = excluded.tier, skill = excluded.skill, culture_key = excluded.culture_key, dc = excluded.dc, dc_is_placeholder = excluded.dc_is_placeholder, teaser = excluded.teaser, editorial_status = excluded.editorial_status;`);
    statements.push(`insert into public.story_fact_text (fact_id, body, pull_quote, adds_aliases)
      values (${quote(id)}, ${quote(rewrite(String(fact.body ?? "")))}, ${quote(fact.pull_quote ?? null)}, ${quote(fact.adds_aliases ?? [])})
      on conflict (fact_id) do update set body = excluded.body, pull_quote = excluded.pull_quote, adds_aliases = excluded.adds_aliases;`);
    statements.push(`insert into public.story_fact_staff (fact_id, canon_ref, skill_tag_reason)
      values (${quote(id)}, ${quote(fact.canon_ref ?? null)}, ${quote(fact.skill_tag_reason ?? null)})
      on conflict (fact_id) do update set canon_ref = excluded.canon_ref, skill_tag_reason = excluded.skill_tag_reason;`);
  }
  for (const link of links) {
    const id = slugToUuid(`link:${String(link.id)}`);
    const table = link.dm_only ? "story_links_dm" : "story_links";
    if (link.dm_only) {
      statements.push(`insert into public.${table} (id, guild_id, from_entry_id, to_entry_id, link_type, label, note)
        values (${quote(id)}, ${guildSql}, ${quote(entryId.get(String(link.from_entry_id)) ?? null)}, ${quote(entryId.get(String(link.to_entry_id)) ?? null)}, ${quote(link.link_type ?? "other")}, ${quote(link.label)}, null)
        on conflict (id) do update set label = excluded.label;`);
    } else {
      statements.push(`insert into public.story_links (id, guild_id, from_entry_id, to_entry_id, link_type, label, editorial_status)
        values (${quote(id)}, ${guildSql}, ${quote(entryId.get(String(link.from_entry_id)) ?? null)}, ${quote(entryId.get(String(link.to_entry_id)) ?? null)}, ${quote(link.link_type ?? "other")}, ${quote(link.label)}, ${quote(link.editorial_status ?? "draft")})
        on conflict (id) do update set label = excluded.label, editorial_status = excluded.editorial_status;`);
    }
  }
  statements.push("commit;");
  const sql = statements.join("\n");
  const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-q"], {
    input: sql,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    fail("Seed failed. The statement was not printed.");
  }
  console.log(`Seeded ${entries.length} entries, ${facts.length} facts, ${links.length} links.`);
}

main();
