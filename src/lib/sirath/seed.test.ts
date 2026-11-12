import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const script = path.resolve("scripts/seed-sirath.ts");

function run(env: Record<string, string>, file?: string) {
  return spawnSync(process.execPath, ["--experimental-strip-types", script, ...(file ? ["--file", file] : [])], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

function outside(name: string, body: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), "sirath-seed-"));
  const file = path.join(dir, name);
  writeFileSync(file, JSON.stringify(body));
  return file;
}

const entry = {
  id: "sample-place",
  kind: "place",
  display_name: "Sample Place",
  editorial_status: "canon",
};

describe("sirath seed loader", () => {
  it("refuses a repo path, a hosted URL, and a missing or dev namespace", () => {
    expect(run({ SIRATH_SOURCE: path.resolve("package.json"), DATABASE_URL: "postgres://local/db", SIRATH_UUID_NAMESPACE: "secret-ns" }).stderr).toMatch(/inside the repo/);
    expect(run({ DATABASE_URL: "postgres://db.example.supabase.co/postgres", SIRATH_UUID_NAMESPACE: "secret-ns" }, outside("ok.json", { entries: [entry] })).stderr).toMatch(/hosted Supabase/);
    expect(run({ DATABASE_URL: "postgres://local/db", SIRATH_UUID_NAMESPACE: "" }, outside("ok.json", { entries: [entry] })).stderr).toMatch(/SIRATH_UUID_NAMESPACE/);
    expect(run({ DATABASE_URL: "postgres://local/db", SIRATH_UUID_NAMESPACE: "sirath-dev-fixture" }, outside("ok.json", { entries: [entry] })).stderr).toMatch(/dev fixture/);
  });

  it("stops on an unknown slug and on a name that is only unfinished", () => {
    const unknown = run(
      { DATABASE_URL: "postgres://local/db", SIRATH_UUID_NAMESPACE: "secret-ns" },
      outside("link.json", { entries: [entry], links: [{ id: "l1", from_entry_id: "sample-place", to_entry_id: "missing-place", label: "thing" }] }),
    );
    expect(unknown.status).not.toBe(0);
    expect(unknown.stderr).toMatch(/Unknown slug/);
    expect(unknown.stdout).not.toContain("secret-ns");

    const unfinished = run(
      { DATABASE_URL: "postgres://local/db", SIRATH_UUID_NAMESPACE: "secret-ns" },
      outside("tbd.json", { entries: [{ ...entry, display_name: "Which ward it stands in: [TBD]." }] }),
    );
    expect(unfinished.status).not.toBe(0);
    expect(unfinished.stderr).toMatch(/no player-facing name/);
    expect(unfinished.stderr).not.toMatch(/\[TBD\]/);
  });
});
