import { describe, expect, it } from "vitest";
import { confirmOtpType, safeNextPath } from "./auth-next";

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

describe("confirm link type", () => {
  it("allows email, magic link, and signup only", () => {
    expect(confirmOtpType("email")).toBe("email");
    expect(confirmOtpType("magiclink")).toBe("magiclink");
    expect(confirmOtpType("signup")).toBe("signup");
    expect(confirmOtpType("recovery")).toBeNull();
    expect(confirmOtpType("")).toBeNull();
    expect(confirmOtpType(null)).toBeNull();
  });
});
