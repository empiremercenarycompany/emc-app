import { describe, expect, it } from "vitest";
import { PENDING_NAMES } from "./pending-names";
import { speciesLabel } from "./species-names";

describe("species labels", () => {
  it("shows Aasimar and Tiefling until a canon rename", () => {
    expect(speciesLabel("aasimar")).toBe("Aasimar");
    expect(speciesLabel("tiefling")).toBe("Tiefling");
    expect(speciesLabel("human", "Human")).toBe("Human");
    expect(PENDING_NAMES.find((row) => row.id === "aasimar")?.pendingRename).toBe(true);
    expect(PENDING_NAMES.find((row) => row.id === "tiefling")?.pendingRename).toBe(true);
  });
});
