import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail, createTransport, closeTransport } = vi.hoisted(() => {
  const sendMail = vi.fn();
  const closeTransport = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail, close: closeTransport }));
  return { sendMail, createTransport, closeTransport };
});

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

import { sendStaffNotice, STAFF_NOTICE_TIMEOUT_MS } from "./staff-notice";

const fields = [
  { label: "Email", value: "recruit@example.test" },
  { label: "Phone", value: "208-555-0100" },
  { label: "Backstory", value: "Raised near the docks." },
];

describe("staff notice", () => {
  beforeEach(() => {
    sendMail.mockReset();
    createTransport.mockClear();
    closeTransport.mockClear();
    sendMail.mockResolvedValue({ messageId: "ok" });
    vi.unstubAllEnvs();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.mocked(console.info).mockRestore();
    vi.mocked(console.error).mockRestore();
    vi.useRealTimers();
  });

  it("skips when the mail env is incomplete", async () => {
    vi.stubEnv("EMC_NOTIFY_TO", "staff@example.test");
    vi.stubEnv("EMC_NOTIFY_SMTP_USER", "mailer@example.test");
    delete process.env.EMC_NOTIFY_SMTP_PASSWORD;
    await sendStaffNotice("New account", fields);
    expect(createTransport).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("sends every field, logs the message id, and keeps the password out of the message and the log", async () => {
    vi.stubEnv("EMC_NOTIFY_TO", "staff@example.test");
    vi.stubEnv("EMC_NOTIFY_SMTP_USER", "mailer@example.test");
    vi.stubEnv("EMC_NOTIFY_SMTP_PASSWORD", "test-smtp-secret");
    await sendStaffNotice("Enlist details", fields);
    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      connectionTimeout: STAFF_NOTICE_TIMEOUT_MS,
      greetingTimeout: STAFF_NOTICE_TIMEOUT_MS,
      socketTimeout: STAFF_NOTICE_TIMEOUT_MS,
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
    expect(console.info).toHaveBeenCalledTimes(1);
    const logged = vi.mocked(console.info).mock.calls.flat().join(" ");
    expect(logged).toBe(JSON.stringify({ status: "sent", messageId: "ok" }));
    expect(logged).not.toContain("test-smtp-secret");
    expect(logged).not.toContain("recruit@example.test");
    expect(logged).not.toContain("Raised near the docks");
    expect(closeTransport).toHaveBeenCalledTimes(1);
  });

  it("does not throw or log the payload when gmail rejects the send", async () => {
    vi.stubEnv("EMC_NOTIFY_TO", "staff@example.test");
    vi.stubEnv("EMC_NOTIFY_SMTP_USER", "mailer@example.test");
    vi.stubEnv("EMC_NOTIFY_SMTP_PASSWORD", "test-smtp-secret");
    sendMail.mockRejectedValueOnce(new Error("535 test-smtp-secret recruit@example.test"));
    await expect(sendStaffNotice("New account", fields)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledTimes(1);
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toBe(JSON.stringify({ status: "failed", messageId: null }));
    expect(logged).not.toContain("test-smtp-secret");
    expect(logged).not.toContain("recruit@example.test");
    expect(logged).not.toContain("208-555-0100");
  });

  it("logs a failure when the send does not finish within 8 seconds", async () => {
    vi.stubEnv("EMC_NOTIFY_TO", "staff@example.test");
    vi.stubEnv("EMC_NOTIFY_SMTP_USER", "mailer@example.test");
    vi.stubEnv("EMC_NOTIFY_SMTP_PASSWORD", "test-smtp-secret");
    vi.useFakeTimers();
    sendMail.mockReturnValue(new Promise(() => {}));
    const pending = sendStaffNotice("Enlist details", fields);
    await vi.advanceTimersByTimeAsync(STAFF_NOTICE_TIMEOUT_MS);
    await pending;
    expect(console.error).toHaveBeenCalledWith(JSON.stringify({ status: "failed", messageId: null }));
    expect(console.info).not.toHaveBeenCalled();
  });
});
