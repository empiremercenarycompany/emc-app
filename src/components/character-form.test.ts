import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CharacterSheet } from "./character-sheet";
import { CharacterForm } from "./character-form";

const species = [
  { id: "human", name: "Human" },
  { id: "elf", name: "Elf" },
  { id: "dwarf", name: "Dwarf" },
];

function html(props: { initialStep: 0 | 1 | 2 | 3 | 4; initialBackgroundId?: string }) {
  return renderToStaticMarkup(createElement(CharacterForm, { species, ...props }));
}

describe("recruitment papers proficiency picks", () => {
  it("asks for three skills or tools when the background feat is Skilled", () => {
    const page = html({ initialStep: 1, initialBackgroundId: "charlatan" });
    expect(page).toContain("Choose three skills or tools.");
    expect(page).toContain("feat-proficiency-picks");
    expect(page).toContain("value=\"skill:athletics\"");
    expect(page).toContain("Thieves");
    expect(page).not.toContain("value=\"skill:deception\"");
    expect(page).not.toContain("value=\"tool:forgery\"");
    expect(page).not.toContain("you have proficiency");
  });

  it("asks a human for one skill and shows that skill on review once chosen", () => {
    const page = html({ initialStep: 2, initialBackgroundId: "farmer" });
    expect(page).toContain("species-proficiency-pick");
    expect(page).toContain("Choose one skill.");
    expect(page).toContain("value=\"skill:athletics\"");
    expect(page).not.toContain("value=\"skill:nature\"");
    expect(page).not.toContain("value=\"skill:animal_handling\"");
  });

  it("shows improvised weapons for Tavern Brawler without a picker", () => {
    const page = html({ initialStep: 1, initialBackgroundId: "sailor" });
    expect(page).toContain("Improvised weapons");
    expect(page).not.toContain("feat-proficiency-picks");
  });

  it("keeps the papers closed until the extra picks are on the page", () => {
    const page = html({ initialStep: 4, initialBackgroundId: "charlatan" });
    expect(page).toContain("Choose three skills or tools.");
    expect(page).toContain("Choose one skill.");
    expect(page).toContain("disabled");
  });
});

describe("sheet training", () => {
  it("highlights granted skills and lists tools and weapons", () => {
    const sheet = renderToStaticMarkup(
      createElement(CharacterSheet, {
        name: "Recruit",
        classLabel: "Recruit",
        level: 1,
        scores: {
          strength: 8,
          dexterity: 8,
          constitution: 8,
          intelligence: 9,
          wisdom: 9,
          charisma: 8,
        },
        hp: 8,
        skillId: "investigation",
        skillIds: ["investigation", "perception", "athletics", "insight"],
        alsoTrained: ["Calligrapher's supplies", "Lute", "Improvised weapons"],
        features: null,
        inventory: null,
        npcs: null,
        progress: null,
      }),
    );
    expect(sheet).toContain("Athletics");
    expect(sheet).toContain("Insight");
    expect(sheet).toContain("trained-pill");
    expect(sheet).toContain("Also trained: Calligrapher&#x27;s supplies, Lute, Improvised weapons");
  });
});
