import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

const INVITE =
  "Bring your Shieldmate. Share your invite code from the EMC app. If your friend joins within 14 days, you'll be in the same squad, you each get $20 off your first two months, and you both start proficient in something you grew up doing together.";

const FORWARD =
  "I just joined the Empire Mercenary Company. Open my Shieldmate invite in the EMC app within 14 days and we'll each get $20 off our first two months: https://emc.thegiantdungeonmaster.com/shieldmate";

const REVEAL =
  "Shieldmates. Join with a friend and you each get $20 off your first two months, and you'll be in the same squad. Pick one thing you two grew up doing together, like a game, an instrument, a trade or a language, and you both start proficient in it. Choose the same session time, and your friend has 14 days to sign up.";

const TEMPLATES = ["supabase/templates/invite.html", "supabase/templates/confirm-signup.html"];

function read(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

describe("Shieldmate copy", () => {
  it("uses the invite and forwardable lines in both auth emails", () => {
    for (const file of TEMPLATES) {
      const text = read(file);
      expect(text).toContain(INVITE);
      expect(text).toContain(FORWARD);
      expect(text).not.toContain("we both get $20 off");
      expect(text).not.toContain("and start proficient");
    }
  });

  it("keeps the one-line checkbox and hides the same-squad reveal until it is checked", () => {
    const text = read("src/components/grew-up-form.tsx");
    expect(text).toContain('const ASK = "Signing up with a friend? Get the Shieldmate bonus"');
    expect(text).toContain(REVEAL);
    const fieldsAt = text.indexOf('id="shieldmate-fields"');
    expect(fieldsAt).toBeGreaterThan(-1);
    expect(text.slice(0, fieldsAt)).not.toContain("{REVEAL}");
    expect(text.slice(fieldsAt)).toContain("{REVEAL}");
    expect(text).toContain("hidden={!open}");
  });

  it("keeps the public squad line and the banned words out of this copy", () => {
    const files = [
      ...TEMPLATES,
      "src/components/grew-up-form.tsx",
      "src/app/squad/page.tsx",
    ];
    for (const file of files) {
      const text = read(file);
      expect(text).not.toMatch(/\breferral\b/i);
      expect(text).not.toMatch(/personal training/i);
      expect(text).not.toMatch(/battle master/i);
      expect(text).not.toMatch(/shield[\s-]mate/i);
      expect(text).not.toMatch(/shieldsmate/i);
    }
    expect(read("src/app/squad/page.tsx")).toContain("Your squad is set by the session time you choose.");
  });
});
