import { afterEach, describe, expect, it, vi } from "vitest";
import { johnChoices } from "@/config/johnChoices";
import {
  CONFIRMATION_WAIVER_PARAGRAPH,
  confirmationFirstName,
  renderPlayerConfirmation,
  type PlayerConfirmationInput,
} from "./player-confirmation-template";

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail, close: vi.fn() }));
  return { sendMail, createTransport };
});

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

import { playerConfirmationEnabled, sendPlayerConfirmation } from "./player-confirmation";

const input: PlayerConfirmationInput = {
  firstName: "Recruit",
  preferredSlot: "9 AM–12 PM",
  email: "recruit@example.test",
};

describe("player confirmation template", () => {
  afterEach(() => {
    johnChoices.shieldmateFullSlot = "waitlist";
    johnChoices.confirmationEmailIncludeWaiver = false;
    vi.unstubAllEnvs();
  });

  it("renders the strategy subject, preheader, and body", () => {
    const message = renderPlayerConfirmation(input);
    expect(message.subject).toBe("We have your enlistment, Recruit");
    expect(message.preheader).toBe(
      "Pay to lock in your spot. Staff confirm your Saturday time within 2 days. If that time doesn't work, we'll find one that does.",
    );
    expect(message.text).toContain("We've received your seat request for the Empire Mercenary Company.");
    expect(message.text).toContain(
      "You asked for 9 AM–12 PM, at Empire Strength and Fitness, 1539 E Piper St, Idaho Falls. Your squad is set by the session time you choose. Pay to lock in your spot. Staff confirm your Saturday time within 2 days. If that time doesn't work, we'll find one that does.",
    );
    expect(message.text).not.toMatch(/18\+|18 and up|adults-only|adults only/i);
    expect(message.text).not.toContain("If you're 16 or 17, Empire Strength and Fitness may ask you to sign the gym's waiver.");
    expect(message.text).toContain("Nothing is charged when you ENLIST.");
    expect(message.text).toContain(
      "Pay to lock in your spot. Staff confirm your Saturday time within 2 days. If that time doesn't work, we'll find one that does. Nothing has been charged yet.",
    );
    expect(message.text).toContain(
      "Your rate: $120 a month with your Empire Strength and Fitness membership included, or $60 a month if you're a current Empire member. Staff will confirm which applies when they confirm your seat.",
    );
    expect(message.text).toContain("you go on the waitlist for it. Staff will find a Saturday time that works.");
    expect(message.text).toContain("Use this same email (recruit@example.test).");
    expect(message.text).toContain("Bring your Shieldmate.");
    expect(message.text).toContain("https://emc.thegiantdungeonmaster.com/shieldmate");
    expect(message.text).toContain("How it works: https://empiremercenarycompany.com/how-it-works");
    expect(message.text).not.toMatch(/\breferral\b/i);
    expect(message.text).not.toMatch(/pay on the Empire/i);
    expect(message.text).not.toContain("TODO-STRATEGY");
    expect(message.text).not.toContain("[PLACEHOLDER]");
    expect(message.text).not.toMatch(/personal training/i);
    expect(message.text).not.toMatch(/photo-release/i);
    expect(confirmationFirstName("Ada")).toBe("Ada");
    expect(confirmationFirstName("  ")).toBe("Recruit");
    expect(confirmationFirstName("recruit@example.test")).toBe("Recruit");
  });

  it("uses the named Shieldmate block, and the next-slot line only when that flag is flipped", () => {
    const paired = renderPlayerConfirmation({ ...input, friendName: "A friend" });
    expect(paired.text).toContain("You're signing up as Shieldmates with A friend.");
    expect(paired.text).toContain("you go on the waitlist for it");
    expect(paired.text).not.toContain("Bring your Shieldmate.");
    johnChoices.shieldmateFullSlot = "next-slot-together";
    const moved = renderPlayerConfirmation({ ...input, invitedBy: "A friend" });
    expect(moved.text).toContain("You named A friend as your Shieldmate.");
    expect(moved.text).toContain("you and your Shieldmate are offered the next slot together.");
    expect(renderPlayerConfirmation(input).text).toContain("you go on the waitlist for it");
    expect(renderPlayerConfirmation({ ...input, ageBand: "16_17" }).text).toContain(
      "If you're 16 or 17, Empire Strength and Fitness may ask you to sign the gym's waiver.",
    );
  });

  it("states the answered rate, and the writ line for any gamegrid src", () => {
    const current = renderPlayerConfirmation({ ...input, gymMember: "current", signupSrc: "gamegrid-writ" });
    expect(current.text).toContain(
      "Your rate: $60 a month. Current Empire Strength and Fitness members pay $60 a month. Have your membership number handy? Add it. If not, leave it blank and staff will look you up.",
    );
    expect(current.text).toContain(
      "You came in on an Enlistment Writ. Your first Game Grid paint night is on the Company after your first paid month. Bring your writ.",
    );
    const beforeBonus = current.text.split("Bring your Shieldmate.")[0] ?? "";
    expect(beforeBonus).not.toMatch(/shieldmate/i);
    const former = renderPlayerConfirmation({ ...input, gymMember: "former", signupSrc: "gamegrid-poster" });
    expect(former.text).toContain(
      "Your rate: $120 a month, the Founding Recruit Rate with your Empire Strength and Fitness membership included.",
    );
    expect(former.text).toContain("Enlistment Writ");
    expect(renderPlayerConfirmation({ ...input, signupSrc: "friend" }).text).not.toContain("Enlistment Writ");
    expect(renderPlayerConfirmation({ ...input, gymMember: "not_yet" }).text).toContain("$120 a month, the Founding Recruit Rate");
  });

  it("leaves the extra waiver paragraph out while that paragraph is empty", () => {
    const plain = renderPlayerConfirmation(input).text;
    johnChoices.confirmationEmailIncludeWaiver = true;
    expect(CONFIRMATION_WAIVER_PARAGRAPH).toBe("");
    expect(renderPlayerConfirmation(input).text).toBe(plain);
    expect(plain).not.toContain("If you're 16 or 17, Empire Strength and Fitness may ask you to sign the gym's waiver.");
    expect(renderPlayerConfirmation({ ...input, ageBand: "16_17" }).text).toContain(
      "If you're 16 or 17, Empire Strength and Fitness may ask you to sign the gym's waiver.",
    );
  });
});

describe("player confirmation send", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    sendMail.mockReset();
    createTransport.mockClear();
  });

  it("stays off unless the flag is exactly true or 1", () => {
    expect(playerConfirmationEnabled({})).toBe(false);
    expect(playerConfirmationEnabled({ EMC_PLAYER_CONFIRMATION_EMAIL_ENABLED: "false" })).toBe(false);
    expect(playerConfirmationEnabled({ EMC_PLAYER_CONFIRMATION_EMAIL_ENABLED: "TRUE" })).toBe(false);
    expect(playerConfirmationEnabled({ EMC_PLAYER_CONFIRMATION_EMAIL_ENABLED: "true" })).toBe(true);
    expect(playerConfirmationEnabled({ EMC_PLAYER_CONFIRMATION_EMAIL_ENABLED: "1" })).toBe(true);
  });

  it("does not open SMTP while the flag is off", async () => {
    delete process.env.EMC_PLAYER_CONFIRMATION_EMAIL_ENABLED;
    vi.stubEnv("EMC_NOTIFY_SMTP_USER", "mailer@example.test");
    vi.stubEnv("EMC_NOTIFY_SMTP_PASSWORD", "test-smtp-secret");
    await sendPlayerConfirmation(input);
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("mails the rendered template when the flag is on and keeps the address out of the log", async () => {
    vi.stubEnv("EMC_PLAYER_CONFIRMATION_EMAIL_ENABLED", "true");
    vi.stubEnv("EMC_NOTIFY_SMTP_USER", "mailer@example.test");
    vi.stubEnv("EMC_NOTIFY_SMTP_PASSWORD", "test-smtp-secret");
    sendMail.mockResolvedValue({ messageId: "ok" });
    vi.spyOn(console, "info").mockImplementation(() => {});
    await sendPlayerConfirmation(input);
    const message = sendMail.mock.calls[0]?.[0] as { from: string; to: string; subject: string; text: string };
    expect(message.from).toBe("Empire Mercenary Company <mailer@example.test>");
    expect(message.to).toBe("recruit@example.test");
    expect(message.subject).toBe("We have your enlistment, Recruit");
    expect(
      message.text.startsWith(
        "Pay to lock in your spot. Staff confirm your Saturday time within 2 days. If that time doesn't work, we'll find one that does.",
      ),
    ).toBe(
      true,
    );
    expect(message.text).toContain(
      "Pay to lock in your spot. Staff confirm your Saturday time within 2 days. If that time doesn't work, we'll find one that does. Nothing has been charged yet.",
    );
    expect(message.text).not.toContain("test-smtp-secret");
    const logged = vi.mocked(console.info).mock.calls.flat().join(" ");
    expect(logged).toBe(JSON.stringify({ status: "sent", messageId: "ok" }));
    expect(logged).not.toContain("recruit@example.test");
    expect(logged).not.toContain("test-smtp-secret");
  });
});
