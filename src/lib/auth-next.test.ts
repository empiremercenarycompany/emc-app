import { describe, expect, it } from "vitest";
import { safeNextPath } from "./auth-next";

describe("sign-in return path", () => {
  it("keeps a same-site path", () => {
    expect(safeNextPath("/")).toBe("/");
    expect(safeNextPath("/goals")).toBe("/goals");
    expect(safeNextPath("/character?welcomed=1")).toBe("/character?welcomed=1");
  });

  it("rejects an open redirect", () => {
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("//evil.com/phish")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("evil.com")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });
});
