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

describe("player-facing copy", () => {
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
