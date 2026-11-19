import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMail, createTransport };
});

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

import { sendStaffNotice } from "./staff-notice";

const fields = [
  { label: "Email", value: "recruit@example.test" },
  { label: "Phone", value: "208-555-0100" },
  { label: "Backstory", value: "Raised near the docks." },
];

describe("staff notice", () => {
  beforeEach(() => {
    sendMail.mockReset();
    createTransport.mockClear();
    sendMail.mockResolvedValue({ messageId: "ok" });
    vi.unstubAllEnvs();
  });

  it("skips when the mail env is incomplete", async () => {
    vi.stubEnv("EMC_NOTIFY_TO", "staff@example.test");
    vi.stubEnv("EMC_NOTIFY_SMTP_USER", "mailer@example.test");
    delete process.env.EMC_NOTIFY_SMTP_PASSWORD;
    await sendStaffNotice("New account", fields);
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("sends every field and keeps the password out of the message", async () => {
    vi.stubEnv("EMC_NOTIFY_TO", "staff@example.test");
    vi.stubEnv("EMC_NOTIFY_SMTP_USER", "mailer@example.test");
    vi.stubEnv("EMC_NOTIFY_SMTP_PASSWORD", "test-smtp-secret");
    await sendStaffNotice("Enlist details", fields);
    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: "mailer@example.test", pass: "test-smtp-secret" },
    });
    const message = sendMail.mock.calls[0]?.[0] as { from: string; to: string; subject: string; text: string };
    expect(message.from).toBe("mailer@example.test");
    expect(message.to).toBe("staff@example.test");
    expect(message.subject).toBe("Enlist details");
    expect(message.text).toContain("Email: recruit@example.test");
    expect(message.text).toContain("Phone: 208-555-0100");
    expect(message.text).toContain("Backstory: Raised near the docks.");
    expect(message.text).not.toContain("test-smtp-secret");
  });

  it("does not throw or log the payload when gmail rejects the send", async () => {
    vi.stubEnv("EMC_NOTIFY_TO", "staff@example.test");
    vi.stubEnv("EMC_NOTIFY_SMTP_USER", "mailer@example.test");
    vi.stubEnv("EMC_NOTIFY_SMTP_PASSWORD", "test-smtp-secret");
    sendMail.mockRejectedValueOnce(new Error("535 test-smtp-secret recruit@example.test"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendStaffNotice("New account", fields)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls.flat().join(" ")).toBe("Staff notice was not sent.");
    error.mockRestore();
  });
});
