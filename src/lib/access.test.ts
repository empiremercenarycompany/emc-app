import { describe, expect, it } from "vitest";
import { roleMayOpen } from "./access";

describe("staff routes", () => {
  it("keeps players out of muster, trainer, and notes", () => {
    for (const path of ["/muster", "/trainer", "/notes", "/muster/extra"]) {
      expect(roleMayOpen("player", path)).toBe(false);
      expect(roleMayOpen(null, path)).toBe(false);
    }
    expect(roleMayOpen("player", "/character")).toBe(true);
    expect(roleMayOpen("dm", "/muster")).toBe(true);
    expect(roleMayOpen("dm", "/trainer")).toBe(true);
    expect(roleMayOpen("dm", "/notes")).toBe(true);
    expect(roleMayOpen("curator", "/notes")).toBe(true);
    expect(roleMayOpen("approver", "/trainer")).toBe(true);
    expect(roleMayOpen("approver", "/muster")).toBe(false);
    expect(roleMayOpen("approver", "/notes")).toBe(false);
  });

  it("opens the table screen for the dm and an admin", () => {
    expect(roleMayOpen("dm", "/dm")).toBe(true);
    expect(roleMayOpen("dm", "/dm/extra")).toBe(true);
    expect(roleMayOpen("admin", "/dm")).toBe(true);
    for (const role of ["player", "curator", "approver"] as const) {
      expect(roleMayOpen(role, "/dm")).toBe(false);
    }
    expect(roleMayOpen(null, "/dm")).toBe(false);
    expect(roleMayOpen("player", "/character")).toBe(true);
  });
});
