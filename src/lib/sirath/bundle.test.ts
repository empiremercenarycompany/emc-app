import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSirathView } from "./book";
import { FIXTURE_SOURCE } from "./fixture-source";

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const child = path.join(dir, entry);
    if (statSync(child).isDirectory()) return filesUnder(child);
    return [child];
  });
}

describe("sirath stays out of the player bundle", () => {
  it("does not import a canon seed from a client module", () => {
    const roots = [path.join(process.cwd(), "src/components"), path.join(process.cwd(), "src/app")];
    const hits: string[] = [];
    for (const file of roots.flatMap((dir) => filesUnder(dir))) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      if (!text.includes('"use client"') && !text.includes("'use client'")) continue;
      if (/sirath_source|fixture-source|lib\/sirath\/source|lib\/sirath\/book|lib\/sirath\/load/.test(text)) hits.push(file);
    }
    expect(hits).toEqual([]);
  });

  it("keeps The Sirath out of the service worker cache", () => {
    const sw = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
    expect(sw).toContain('pathname.startsWith("/sirath/")');
    expect(sw).toContain("emc-shell-v6");
    const shell = sw.slice(sw.indexOf("const SHELL"), sw.indexOf("self.addEventListener"));
    expect(shell).not.toContain("sirath");
  });

  it("drops a sealed fake body", () => {
    const blob = JSON.stringify(buildSirathView(FIXTURE_SOURCE, "ch-a1"));
    expect(blob).not.toContain("FAKE_SEALED_ALCHEMY_BODY");
  });
});
