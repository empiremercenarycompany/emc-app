import nodemailer from "nodemailer";
import {
  renderPlayerConfirmation,
  type PlayerConfirmationInput,
} from "@/lib/notify/player-confirmation-template";
import { STAFF_NOTICE_TIMEOUT_MS } from "@/lib/notify/staff-notice";

type SendResult = { status: "sent"; messageId: string | null } | { status: "failed"; messageId: null };

function logSend(result: SendResult) {
  const line = JSON.stringify({ status: result.status, messageId: result.messageId });
  if (result.status === "sent") console.info(line);
  else console.error(line);
}

/** Only the exact strings true and 1 turn this on. Unset stays off, and nobody is mailed. */
export function playerConfirmationEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const value = env.EMC_PLAYER_CONFIRMATION_EMAIL_ENABLED;
  return value === "true" || value === "1";
}

/** Player mail after enlist. The flag defaults off, so this returns before any SMTP call. */
export async function sendPlayerConfirmation(input: PlayerConfirmationInput): Promise<void> {
  if (!playerConfirmationEnabled()) return;
  const to = input.email.trim();
  const user = process.env.EMC_NOTIFY_SMTP_USER?.trim();
  const pass = process.env.EMC_NOTIFY_SMTP_PASSWORD;
  if (!to || !user || !pass) return;
  const rendered = renderPlayerConfirmation({ ...input, email: to });
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    connectionTimeout: STAFF_NOTICE_TIMEOUT_MS,
    greetingTimeout: STAFF_NOTICE_TIMEOUT_MS,
    socketTimeout: STAFF_NOTICE_TIMEOUT_MS,
    auth: { user, pass },
  });
  const pending = transport
    .sendMail({
      from: `Empire Mercenary Company <${user}>`,
      to,
      subject: rendered.subject,
      text: `${rendered.preheader}\n\n${rendered.text}`,
    })
    .then(
      (info): SendResult => ({
        status: "sent",
        messageId: typeof info.messageId === "string" && info.messageId ? info.messageId : null,
      }),
      (): SendResult => ({ status: "failed", messageId: null }),
    );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timed = new Promise<SendResult>((resolve) => {
    timer = setTimeout(() => resolve({ status: "failed", messageId: null }), STAFF_NOTICE_TIMEOUT_MS);
  });
  try {
    logSend(await Promise.race([pending, timed]));
  } finally {
    if (timer) clearTimeout(timer);
    try {
      transport.close();
    } catch {
      // The socket is already closed.
    }
  }
}
