import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CharacterForm } from "@/components/character-form";
import { GenuineSeal } from "@/components/genuine-seal";
import { SealedDocument } from "@/components/sealed-document";
import { WaxSeal } from "@/components/wax-seal";
import { COMPANY_DOCUMENTS } from "@/lib/documents";
import { FACTION_SEALS, factionSeal, PLACEHOLDER_WAX } from "@/lib/seals/factions";
import { resolveSeal } from "@/lib/seals/resolve";
import { rem, SIGNATURE_SIZES, signatureSize, SUBHEADING_SIZE } from "@/lib/seals/signatures";
import { FIXTURE_SOURCE } from "@/lib/sirath/fixture-source";

const species = [
  { id: "human", name: "Human" },
  { id: "elf", name: "Elf" },
];

describe("faction seals", () => {
  it("seals the Company and skips the Sirath fixture faction", () => {
    const factions = FIXTURE_SOURCE.entries.filter((entry) => entry.kind === "faction");
    expect(factions.map((entry) => entry.id)).toEqual(["sample-company"]);
    expect(factionSeal("sample-company")).toBeNull();
    expect(factionSeal("company")?.name).toBe("Empire Mercenary Company");
    expect(Object.keys(FACTION_SEALS)).toEqual(["company"]);
    for (const faction of Object.values(FACTION_SEALS)) {
      expect(Object.values(PLACEHOLDER_WAX)).toContain(faction.color.hex);
      expect(faction.color.id.startsWith("placeholder-")).toBe(true);
      expect(faction.motif).toEqual({ kind: "placeholder", id: "ring" });
    }
    const source = readFileSync(path.join(process.cwd(), "src/lib/seals/factions.ts"), "utf8");
    expect(source).toContain("TODO(lore)");
    expect(source).not.toContain("Sample Company");
    expect(source).not.toContain("sample-company");
    expect(factionSeal("invented-faction")).toBeNull();
  });

  it("keeps one color per faction and varies the press by maker", () => {
    const valthar = resolveSeal({ factionId: "company", makerId: "valthar" });
    const desk = resolveSeal({ factionId: "company", makerId: "company" });
    const again = resolveSeal({ factionId: "company", makerId: "valthar" });
    const reference = resolveSeal({ factionId: "company", makerId: "valthar", reference: true });
    expect(valthar?.wax).toBe(FACTION_SEALS.company.color.hex);
    expect(desk?.wax).toBe(valthar?.wax);
    expect(valthar?.body).not.toBe(desk?.body);
    expect(valthar?.drip).not.toBe(desk?.drip);
    expect(valthar?.makerMark).not.toEqual(desk?.makerMark);
    expect(again).toEqual(valthar);
    expect(reference?.rotation).toBe(0);
    expect(reference?.makerMark).toEqual({ kind: "none" });
    expect(reference?.wax).toBe(valthar?.wax);
    expect(reference?.label).toBe("Wax seal of Empire Mercenary Company");
  });

  it("paints a false seal from deviations and never labels it", () => {
    const forged = renderToStaticMarkup(
      createElement(WaxSeal, {
        factionId: "company",
        makerId: "valthar",
        genuine: false,
        deviations: { shade: "#112233", impression: { kind: "path", id: "wrong", d: "M2 2 H20 V20 H2 Z" } },
      }),
    );
    expect(forged).toContain("#112233");
    expect(forged).toContain("M2 2 H20 V20 H2 Z");
    expect(forged).toContain("Wax seal of Empire Mercenary Company");
    expect(forged).not.toMatch(/genuine|forged|false seal|not a real/i);
    expect(forged).not.toContain("data-genuine");

    const ignored = renderToStaticMarkup(
      createElement(WaxSeal, {
        factionId: "company",
        makerId: "valthar",
        deviations: { shade: "#112233", impression: { kind: "path", id: "wrong", d: "M2 2 H20 V20 H2 Z" } },
      }),
    );
    expect(ignored).not.toContain("#112233");
    expect(ignored).toContain(FACTION_SEALS.company.color.hex);
    expect(ignored).not.toContain("M2 2 H20 V20 H2 Z");

    const junk = resolveSeal({
      factionId: "company",
      makerId: "valthar",
      genuine: false,
      deviations: { shade: "red", impression: { kind: "symbol", id: "not-a-real-motif" } },
    });
    expect(junk?.wax).toBe(FACTION_SEALS.company.color.hex);
    expect(junk?.impression).toEqual({ kind: "ring" });
    expect(resolveSeal({ factionId: "sample-company", makerId: "valthar" })).toBeNull();
  });
});

describe("signature sizes", () => {
  it("keeps every signer at least a subheading, and Valthar larger", () => {
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/h2\s*\{[^}]*font-size:\s*1\.35rem/);
    expect(SUBHEADING_SIZE).toBe("1.35rem");
    expect(rem(signatureSize("default"))).toBeGreaterThanOrEqual(rem(SUBHEADING_SIZE));
    expect(rem(signatureSize("valthar"))).toBeGreaterThan(rem(signatureSize("default")));
    expect(rem(signatureSize("valthar"))).toBeGreaterThanOrEqual(rem(SUBHEADING_SIZE));
    expect(signatureSize("someone-else")).toBe(SIGNATURE_SIZES.default);
    expect(SIGNATURE_SIZES.valthar).toBe(signatureSize("valthar"));
  });
});

describe("signed papers", () => {
  it("signs the company notice with Valthar and does not add a false seal", () => {
    const roster = JSON.parse(readFileSync(path.join(process.cwd(), "supabase/seed/roster.json"), "utf8")) as {
      characters: { name: string }[];
    };
    expect(roster.characters.map((person) => person.name)).toContain("Valthar Brightlance");
    expect(COMPANY_DOCUMENTS).toHaveLength(1);
    const notice = COMPANY_DOCUMENTS[0];
    expect(notice?.signature).toEqual({ signerId: "valthar", name: "Valthar Brightlance" });
    expect(notice?.seal).toEqual({ factionId: "company", makerId: "valthar" });
    expect(notice?.seal.genuine).toBeUndefined();
    const html = renderToStaticMarkup(createElement(SealedDocument, { document: notice! }));
    expect(html).toContain("Valthar Brightlance");
    expect(html).toContain("data-signer=\"valthar\"");
    expect(html).toContain("font-size:2.4rem");
    expect(html).toContain("Wax seal of Empire Mercenary Company");
    expect(html).not.toMatch(/genuine|forged|false seal/i);
    const reference = renderToStaticMarkup(createElement(GenuineSeal, { factionId: "company" }));
    expect(reference).toContain("What a genuine seal looks like");
    expect(reference).toContain("Wax seal of Empire Mercenary Company");
    expect(reference).toContain("data-size=\"reference\"");
    expect(reference).not.toContain("M100 28");
    expect(renderToStaticMarkup(createElement(GenuineSeal, { factionId: "sample-company" }))).toBe("");
    expect(html).not.toContain("Sample Company");
  });

  it("seals the recruitment review with the company press", () => {
    const html = renderToStaticMarkup(createElement(CharacterForm, { species, initialStep: 4 }));
    expect(html).toContain("Wax seal of Empire Mercenary Company");
    expect(html).not.toMatch(/genuine|forged|false seal/i);
  });
});
