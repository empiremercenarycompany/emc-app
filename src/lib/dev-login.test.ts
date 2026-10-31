import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import roster from "../../supabase/seed/roster.json";
import { DEV_LOGIN_PASSWORD, devAccountEmail, devLoginAllowed, devRosterAccounts } from "./dev-login";

describe("dev login gate", () => {
  it("stays off without the flag or off localhost", () => {
    expect(devLoginAllowed(undefined, "127.0.0.1:3000")).toBe(false);
    expect(devLoginAllowed("0", "localhost")).toBe(false);
    expect(devLoginAllowed("1", "example.com")).toBe(false);
    expect(devLoginAllowed("1", "localhost.example.com")).toBe(false);
    expect(devLoginAllowed("1", "127.0.0.1:3000")).toBe(true);
    expect(devLoginAllowed("1", "localhost")).toBe(true);
  });

  it("offers character names and keeps the roster in the seed file", () => {
    const labels = devRosterAccounts().map((row) => row.label);
    expect(labels).toContain("Alexandria");
    expect(labels).toContain("Valthar Brightlance");
    expect(labels).not.toContain("Melichar");
    expect(devAccountEmail("Alexandria")).toBe("alexandria@example.test");
    expect(devAccountEmail("stranger@example.com")).toBeNull();
    const route = readFileSync(path.join(process.cwd(), "src/app/api/dev-login/route.ts"), "utf8");
    expect(route).not.toContain("signInWithPassword");
    expect(route).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(route).toContain("devLoginAllowed");
    const sql = readFileSync(path.join(process.cwd(), "supabase/seed/test_accounts.sql"), "utf8");
    expect(sql).toContain(DEV_LOGIN_PASSWORD);
    for (const row of roster.characters) {
      expect(sql).toContain(row.email);
      expect(sql).toContain(row.squad);
      expect(sql).toContain(row.name);
    }
  });
});
