import nodemailer from "nodemailer";
import { noticeBody, type NoticeField } from "@/lib/notify/signup-fields";

/** Bound the SMTP handshake so a serverless invocation does not wait on a dead socket. */
export const STAFF_NOTICE_TIMEOUT_MS = 8_000;

type SendResult = { status: "sent"; messageId: string | null } | { status: "failed"; messageId: null };

function logSend(result: SendResult) {
  const line = JSON.stringify({ status: result.status, messageId: result.messageId });
  if (result.status === "sent") console.info(line);
  else console.error(line);
}

/**
 * Gmail SMTP. Missing config skips the send. A mail failure stays here.
 * `toAddress` overrides EMC_NOTIFY_TO for an owner alert. Tests leave the SMTP
 * password unset, so this stays a no-op and never sends.
 */
export async function sendStaffNotice(event: string, fields: NoticeField[], toAddress?: string): Promise<void> {
  const to = (toAddress ?? process.env.EMC_NOTIFY_TO)?.trim();
  const user = process.env.EMC_NOTIFY_SMTP_USER?.trim();
  const pass = process.env.EMC_NOTIFY_SMTP_PASSWORD;
  if (!to || !user || !pass) return;
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    connectionTimeout: STAFF_NOTICE_TIMEOUT_MS,
    greetingTimeout: STAFF_NOTICE_TIMEOUT_MS,
    socketTimeout: STAFF_NOTICE_TIMEOUT_MS,
    auth: { user, pass },
  });
  const pending = transport.sendMail({ from: user, to, subject: event, text: noticeBody(fields) }).then(
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
