import { describe, expect, it } from "vitest";
import { attackParts } from "./attacks";

describe("recorded attacks", () => {
  it("keeps a name that has no damage roll", () => {
    expect(attackParts("Electrified Longsword +1")).toEqual({
      name: "Electrified Longsword +1",
      bonus: null,
      damage: null,
    });
    expect(attackParts("Dagger")).toEqual({ name: "Dagger", bonus: null, damage: null });
  });

  it("reads a bonus and damage only when both are written", () => {
    expect(attackParts("Dagger +5 1d4+2")).toEqual({ name: "Dagger", bonus: "+5", damage: "1d4+2" });
    expect(attackParts("Shortbow 1d6")).toEqual({ name: "Shortbow", bonus: null, damage: "1d6" });
  });
});
