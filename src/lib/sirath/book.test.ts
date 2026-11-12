import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSirathView, knowsFact } from "./book";
import type { SirathSource } from "./types";

const source = JSON.parse(
  readFileSync(path.join(process.cwd(), "supabase/seed/sirath_source.json"), "utf8"),
) as SirathSource;

const TOKEN = /\{\{([a-z0-9-]+)\|([^}]*)\}\}/g;

describe("sirath book query path", () => {
  it("gates every baseline and roll fact on its own skill, then leaks nothing", () => {
    for (const character of source.characters) {
      const view = buildSirathView(source, character.id);
      expect(view, character.id).not.toBeNull();
      if (!view) continue;
      const blob = JSON.stringify(view);
      const rolls = new Map<string, number>();
      for (const check of source.checks) {
        if (check.character_id !== character.id || check.kind !== "roll") continue;
        const key = `${check.entry_id}:${check.skill}`;
        rolls.set(key, Math.max(rolls.get(key) ?? -99, check.total));
      }
      const exported = new Set(view.entries.flatMap((entry) => entry.tiers.recall.map((fact) => fact.id)));
      const visible = new Set(view.entries.map((entry) => entry.id));

      for (const fact of source.facts) {
        if (fact.tier !== "baseline" && fact.tier !== "roll") continue;
        let extra = 0;
        if (fact.skill === "culture" && fact.culture_id) {
          const own = character.cultures.includes(fact.culture_id) ? 4 : 0;
          const language = source.rules.culture_language[fact.culture_id];
          const knows = language && character.languages.includes(language) ? 2 : 0;
          extra = source.rules.culture_bonus.stacks ? own + knows : Math.max(own, knows);
        }
        const roll = rolls.get(`${fact.entry_id}:${fact.skill}`);
        const ok =
          (fact.tier === "baseline" && fact.skill != null && 10 + character.skill_mods[fact.skill] + extra >= (fact.dc ?? 99)) ||
          (roll != null && roll + extra >= (fact.dc ?? 99));
        if (exported.has(fact.id)) {
          expect(ok, `${character.id} exported ${fact.id} without meeting its DC`).toBe(true);
        } else if (visible.has(fact.entry_id)) {
          expect(ok, `${character.id} met the DC for ${fact.id} but it was sealed`).toBe(false);
        } else {
          expect(blob.includes(`"${fact.id}"`), `${character.id} sealed fact id ${fact.id}`).toBe(false);
          const plain = fact.body.replace(TOKEN, "$2");
          for (const chunk of plain.split(/[.:]/)) {
            if (chunk.trim().length > 25) expect(blob.includes(chunk.trim()), `${character.id} sealed text ${fact.id}`).toBe(false);
          }
        }
      }

      for (const fact of source.facts) {
        if (fact.tier !== "discovery") continue;
        const uncovered = view.entries.some((entry) => entry.tiers.uncovered.some((row) => row.id === fact.id));
        if (!uncovered) expect(blob.includes(`"${fact.id}"`), `${character.id} undiscovered ${fact.id}`).toBe(false);
      }

      for (const entry of source.entries) {
        if (visible.has(entry.id)) continue;
        for (const needle of [`"${entry.id}"`, `{{${entry.id}|`, `#/sirath/${entry.id}`]) {
          expect(blob.includes(needle), `${character.id} leaked id ${entry.id}`).toBe(false);
        }
        let scrubbed = blob;
        if (entry.public_name) {
          for (const fact of source.facts) {
            for (const match of fact.body.matchAll(new RegExp(`\\{\\{${entry.id}\\|([^}]*)\\}\\}`, "g"))) {
              scrubbed = scrubbed.replaceAll(`{{!plain|${match[1]}}}`, "");
            }
          }
          scrubbed = scrubbed.replaceAll(`"public_name":"${entry.display_name}"`, "");
          scrubbed = scrubbed.replaceAll(`"public_name": "${entry.display_name}"`, "");
        } else {
          expect(blob.includes(`"public_name": "${entry.display_name}"`), `${character.id} non-public name field`).toBe(false);
        }
        for (const needle of [entry.display_name, ...entry.aliases]) {
          expect(scrubbed.includes(needle), `${character.id} leaked name ${needle}`).toBe(false);
        }
      }

      expect(blob).not.toMatch(/Velryn|Dananir|public_name_basis|skill_tag_reason|canon_ref/);
      expect(blob).not.toMatch(/"facet"|good\/bad\/weird|splinter/i);
      for (const link of source.links) {
        if (!link.dm_only) continue;
        expect(blob.includes(link.id), `${character.id} dm link ${link.id}`).toBe(false);
      }
    }
  });

  it("shows the squad book, the recruit book, the culture bonus, and a sealed alchemy fact", () => {
    const squad = buildSirathView(source, "ch-a1");
    const recruit = buildSirathView(source, "ch-r1");
    const halfling = buildSirathView(source, "ch-b1");
    expect(squad?.home.learned_count).toBeGreaterThan(recruit?.home.learned_count ?? 0);
    expect(recruit?.is_new_recruit).toBe(true);
    expect(squad?.is_new_recruit).toBe(false);
    expect(squad?.home.new_entry_ids).toEqual(["valthar", "aligher"]);
    const bleak = squad?.entries.find((entry) => entry.id === "bleakspire");
    expect(bleak?.tiers.sealed.some((fact) => fact.skill === "alchemy" && fact.dc === 18)).toBe(true);
    expect(JSON.stringify(bleak)).not.toContain("scavenged magical technology");
    const hollows = halfling?.entries.find((entry) => entry.id === "hollows");
    const culture = hollows?.tiers.recall.find((fact) => fact.skill === "culture");
    expect(culture?.bonus).toEqual({ own_culture: 4, knows_language: 2, total: 6 });
    expect(culture?.how).toBe("passive");
    const closed = squad?.entries.find((entry) => entry.id === "hollows");
    expect(closed?.tiers.recall.some((fact) => fact.skill === "culture")).toBe(false);
    expect(closed?.tiers.sealed.some((fact) => fact.skill === "culture")).toBe(true);
  });

  it("does not let a history roll open an alchemy fact", () => {
    const character = source.characters.find((item) => item.id === "ch-a1");
    const fact = source.facts.find((item) => item.id === "f-bl-7");
    expect(character && fact).toBeTruthy();
    if (!character || !fact) return;
    const rolls = new Map<string, number>([["bleakspire:history", 20]]);
    expect(knowsFact(character, fact, rolls, source.rules)).toBeNull();
    const opened = knowsFact(character, fact, new Map([["bleakspire:alchemy", 18]]), source.rules);
    expect(opened?.how).toBe("roll");
  });
});
