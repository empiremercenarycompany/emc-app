import { describe, expect, it } from "vitest";
import { grewUpChoice, grewUpLabel, grewUpOptions } from "./grew-up";

describe("grew up together", () => {
  it("offers only named SRD choices and no rules text", () => {
    const tools = grewUpOptions("tool");
    const languages = grewUpOptions("language");
    const instruments = grewUpOptions("instrument");
    const games = grewUpOptions("gaming");
    expect(tools.some((option) => option.id === "smith")).toBe(true);
    expect(languages.map((option) => option.label)).toContain("Common Sign Language");
    expect(languages.map((option) => option.label)).toContain("Orc");
    expect(instruments.map((option) => option.label)).toContain("Pan flute");
    expect(games.map((option) => option.id)).toEqual(["dice", "dragonchess", "cards", "three_dragon_ante"]);
    const blob = [...tools, ...languages, ...instruments, ...games].map((option) => option.label).join("\n");
    expect(blob).not.toMatch(/Player's Handbook|you have proficiency|add your proficiency bonus/i);
    expect(grewUpChoice("language", "elvish")).toBe(true);
    expect(grewUpChoice("language", "undercommon")).toBe(false);
    expect(grewUpLabel("instrument", "lute")).toBe("Lute");
  });
});
