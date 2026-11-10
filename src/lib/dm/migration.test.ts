import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  path.join(__dirname, "../../../supabase/migrations/20261110104357_dm_dashboard.sql"),
  "utf8",
);

describe("dm dashboard migration", () => {
  it("requires dm_only and defaults it to true", () => {
    for (const table of [
      "glossary_entries",
      "glossary_dossiers",
      "glossary_entry_bodies",
      "glossary_links",
      "npc_proficiencies",
    ]) {
      expect(sql).toContain(`create table public.${table}`);
    }
    expect(sql.match(/dm_only boolean not null default true/g)?.length).toBe(5);
    expect(sql.match(/as restrictive/g)?.length).toBe(6);
    expect(sql).toContain("public.is_admin()");
    expect(sql).not.toContain("dm_or_open_child");
    expect(sql).not.toContain("not dm_only and not");
    expect(sql).toContain("security_invoker");
    expect(sql).toContain("security_barrier");
    expect(sql.toLowerCase()).toContain("[dm-only]");
    expect(sql.toLowerCase()).not.toContain("insert into public.glossary");
  });

  it("does not grant the book to anon", () => {
    expect(sql).toContain("revoke all on public.glossary_entry_bodies from public, anon, authenticated");
    expect(sql).not.toMatch(/grant\s+[^;]*\bto\s+anon\b/i);
    expect(sql).toContain("grant select, insert, update, delete on public.glossary_entries to authenticated");
  });
});
