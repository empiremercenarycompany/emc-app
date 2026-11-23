import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { johnChoices } from "@/config/johnChoices";
import { AGE_RULE, APP_PAYMENT_COPY } from "./public-copy";

const ROOT = path.resolve(__dirname, "../../..");

function read(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

describe("public payment and age copy", () => {
  it("uses the schedule payment line and the age rule", () => {
    expect(APP_PAYMENT_COPY).toContain("$60/mo");
    expect(APP_PAYMENT_COPY).toContain("$120/mo");
    expect(APP_PAYMENT_COPY).toContain("payment link through EMC's Stripe");
    expect(APP_PAYMENT_COPY).not.toMatch(/pay on the Empire/i);
    expect(AGE_RULE).toContain("16 and up");
    expect(AGE_RULE).toContain("No guardian is needed");
    expect(AGE_RULE).toContain("7–10 PM slot is for ages 18 and up");
    expect(AGE_RULE).toContain("teen waitlist");
    for (const file of ["src/app/schedule/page.tsx", "src/components/intake-form.tsx"]) {
      const text = read(file);
      expect(text).toContain("APP_PAYMENT_COPY");
      expect(text).toContain("AGE_RULE");
      expect(text).not.toMatch(/pay on the Empire/i);
      expect(text).not.toMatch(/Empire Gym/i);
      expect(text).not.toMatch(/Scottie/i);
    }
  });

  it("keeps John's open choices at the live defaults", () => {
    const source = read("src/config/johnChoices.ts");
    expect(johnChoices.shieldmateFullSlot).toBe("waitlist");
    expect(johnChoices.confirmationEmailIncludeWaiver).toBe(false);
    expect(johnChoices.termsEffectiveDate).toBe("November 12, 2026");
    expect(johnChoices.faqShowCostQuestion).toBe(false);
    expect(johnChoices.faqShow120).toBe(false);
    expect(johnChoices.faqShowEverySaturday).toBe(false);
    expect(source).toContain('termsEffectiveDate: "November 12, 2026"');
  });

  it("redirects privacy and terms to the public site", () => {
    const config = read("next.config.ts");
    const middleware = read("src/middleware.ts");
    expect(config).toContain('destination: "https://empiremercenarycompany.com/privacy", permanent: true');
    expect(config).toContain('destination: "https://empiremercenarycompany.com/terms", permanent: true');
    expect(middleware).toContain("https://empiremercenarycompany.com${path}");
    expect(middleware).toContain("308");
    const footer = read("src/components/site-footer.tsx");
    expect(footer).toContain('href="/privacy"');
    expect(footer).toContain('href="/terms"');
    expect(footer).toContain("johnChoices.termsEffectiveDate");
  });

  it("uses the armory scene when a player has no portrait", () => {
    const portrait = read("src/components/portrait.tsx");
    expect(portrait).toContain('"/art/header-band-placeholder.jpg"');
    expect(portrait).not.toContain("/portraits/fallback.svg");
  });
});
