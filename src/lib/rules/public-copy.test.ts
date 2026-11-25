import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { johnChoices } from "@/config/johnChoices";
import {
  AGE_RULE,
  FAQ_COST_COPY,
  GYM_MEMBER_OPTIONS,
  PRICE_ONE_LINE,
  SCHEDULE_PRICE_COPY,
  confirmationRateLine,
  gamegridLead,
  gamegridWritLine,
} from "./public-copy";

const ROOT = path.resolve(__dirname, "../../..");

function read(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

describe("public payment and age copy", () => {
  it("uses the schedule payment line and the age rule", () => {
    expect(SCHEDULE_PRICE_COPY.startsWith("Founding Recruit Rate: $120/month")).toBe(true);
    expect(SCHEDULE_PRICE_COPY.indexOf("$120/month")).toBeLessThan(SCHEDULE_PRICE_COPY.indexOf("$60/month"));
    expect(SCHEDULE_PRICE_COPY).toContain("No payments are taken in the app.");
    expect(PRICE_ONE_LINE).toBe("$120/month with gym membership included. Current Empire members: $60/month.");
    expect(FAQ_COST_COPY).not.toMatch(/shieldmate/i);
    expect(GYM_MEMBER_OPTIONS.map((option) => option.id)).toEqual(["not_yet", "former", "current"]);
    expect(confirmationRateLine("former")).toContain("$120 a month");
    expect(confirmationRateLine("current")).toContain("$60 a month");
    expect(confirmationRateLine(null)).toContain("Staff will confirm which applies");
    expect(gamegridLead("gamegrid-writ")).toBe(true);
    expect(gamegridLead("friend")).toBe(false);
    expect(gamegridWritLine("gamegrid-writ")).toContain("after your first paid month");
    expect(gamegridWritLine("gamegrid-poster")).toBeNull();
    expect(SCHEDULE_PRICE_COPY).not.toMatch(/pay on the Empire/i);
    expect(SCHEDULE_PRICE_COPY).not.toMatch(/shieldmate/i);
    expect(AGE_RULE).toContain("16 and up");
    expect(AGE_RULE).toContain("No guardian is needed");
    expect(AGE_RULE).toContain("7–10 PM slot is for ages 18 and up");
    expect(AGE_RULE).toContain("teen waitlist");
    const schedule = read("src/app/schedule/page.tsx");
    const intake = read("src/components/intake-form.tsx");
    expect(schedule).toContain("SCHEDULE_PRICE_COPY");
    expect(schedule).toContain("SATURDAY_TABLE_COPY");
    expect(schedule).not.toContain("AGE_RULE");
    expect(schedule).not.toContain("(18+)");
    expect(intake).toContain("Which rate is yours?");
    expect(intake).toContain("GYM_MEMBER_OPTIONS");
    expect(intake).not.toMatch(/shieldmate/i);
    for (const text of [schedule, intake]) {
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
