import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { speciesLabel } from "./species-names";

const ROOT = path.resolve(__dirname, "../../..");

function filesIn(dir: string): string[] {
  const full = path.join(ROOT, dir);
  return readdirSync(full).flatMap((entry) => {
    const child = path.join(full, entry);
    if (statSync(child).isDirectory()) return filesIn(path.relative(ROOT, child));
    return [child];
  });
}

describe("Orc and Ork stay separate", () => {
  it("does not display one as the other", () => {
    expect(speciesLabel("orc", "Orc")).toBe("Orc");
    expect(speciesLabel("ork", "Ork")).toBe("Ork");
    expect(speciesLabel("orc", "Orc")).not.toBe("Ork");
    expect(speciesLabel("ork", "Ork")).not.toBe("Orc");
  });

  it("has no alias that folds Ork into Orc", () => {
    const hits: string[] = [];
    const forbidden = [
      /['"]ork['"]\s*:\s*['"]orc['"]/i,
      /['"]orc['"]\s*:\s*['"]ork['"]/i,
      /replace\(\s*\/orks?/i,
      /replace\(\s*\/orcs?/i,
    ];
    for (const file of filesIn("src")) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      if (forbidden.some((pattern) => pattern.test(text))) hits.push(path.relative(ROOT, file));
    }
    expect(hits).toEqual([]);
  });
});
