import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const SCAN = ["src", "public/sw.js"];

const FORBIDDEN = [
  /fortress city/i,
  /\bgods?\b/i,
  /\bdeit(?:y|ies)\b/i,
  /mnemozar/i,
  /paladine/i,
  /pelor/i,
];

function filesIn(dir: string): string[] {
  const full = path.join(ROOT, dir);
  if (!statSync(full).isDirectory()) return [full];
  return readdirSync(full).flatMap((entry) => {
    const child = path.join(full, entry);
    if (statSync(child).isDirectory()) return filesIn(path.relative(ROOT, child));
    return [child];
  });
}

const PLAYER_COPY = [
  "src/app/page.tsx",
  "src/app/about/page.tsx",
  "src/app/sign-in/page.tsx",
  "src/app/character/page.tsx",
  "src/app/character/new/page.tsx",
  "src/app/work/page.tsx",
  "src/app/goals/page.tsx",
  "src/app/squad/page.tsx",
  "src/app/journal/page.tsx",
  "src/app/missions/page.tsx",
  "src/app/schedule/page.tsx",
  "src/app/check-in/page.tsx",
  "src/app/muster/page.tsx",
  "src/app/trainer/page.tsx",
  "src/app/dice/page.tsx",
  "src/app/notes/page.tsx",
  "src/components/ui.tsx",
  "src/components/character-form.tsx",
  "src/components/journal-builder.tsx",
  "src/components/sign-in-form.tsx",
  "src/components/nav.tsx",
  "src/components/character-sheet.tsx",
  "src/components/npc-form.tsx",
  "src/components/dice-roller.tsx",
  "src/app/profile/page.tsx",
  "src/app/intake/page.tsx",
  "src/components/check-in-form.tsx",
  "src/components/intake-form.tsx",
  "src/components/work-kind.tsx",
  "src/components/term.tsx",
];

describe("player-facing copy", () => {
  it("calls the company the Company", () => {
    const hits: string[] = [];
    for (const file of PLAYER_COPY) {
      const text = readFileSync(path.join(ROOT, file), "utf8");
      if (/\bguilds?\b/i.test(text)) hits.push(file);
      if (/\b(Aasimar|Tiefling)\b/.test(text)) hits.push(file);
    }
    expect(hits).toEqual([]);
  });

  it("does not call attribute growth points", () => {
    const hits: string[] = [];
    for (const file of PLAYER_COPY) {
      const text = readFileSync(path.join(ROOT, file), "utf8");
      if (/\bpoints?\b/i.test(text)) hits.push(file);
    }
    expect(hits).toEqual([]);
  });

  it("does not render a TODO marker", () => {
    const hits: string[] = [];
    for (const file of filesIn("src/app").concat(filesIn("src/components"))) {
      if (!file.endsWith(".tsx")) continue;
      const text = readFileSync(file, "utf8");
      if (/TODO\(/.test(text)) hits.push(path.relative(ROOT, file));
    }
    expect(hits).toEqual([]);
  });

  it("does not invent lore or name gods", () => {
    const hits: string[] = [];
    for (const file of SCAN.flatMap((entry) => filesIn(entry))) {
      if (!/\.(ts|tsx|js|css|json)$/.test(file)) continue;
      if (file.endsWith("copy.test.ts")) continue;
      const text = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN) {
        if (pattern.test(text)) hits.push(`${path.relative(ROOT, file)} matches ${pattern}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
