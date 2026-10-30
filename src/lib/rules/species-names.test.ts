import { describe, expect, it } from "vitest";
import { INFERNI, SERAPH, speciesLabel } from "./species-names";

describe("homebrew species labels", () => {
  it("renames two ids and leaves the rest", () => {
    expect(speciesLabel("aasimar")).toBe(SERAPH);
    expect(speciesLabel("tiefling")).toBe(INFERNI);
    expect(speciesLabel("human", "Human")).toBe("Human");
    expect(INFERNI).toBe("Inferni");
  });
});
