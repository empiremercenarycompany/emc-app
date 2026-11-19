import nodemailer from "nodemailer";
import { noticeBody, type NoticeField } from "@/lib/notify/signup-fields";

/** Gmail SMTP. Missing config skips the send. A mail failure stays here. */
export async function sendStaffNotice(event: string, fields: NoticeField[]): Promise<void> {
  const to = process.env.EMC_NOTIFY_TO?.trim();
  const user = process.env.EMC_NOTIFY_SMTP_USER?.trim();
  const pass = process.env.EMC_NOTIFY_SMTP_PASSWORD;
  if (!to || !user || !pass) return;
  try {
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
    await transport.sendMail({
      from: user,
      to,
      subject: event,
      text: noticeBody(fields),
    });
  } catch {
    console.error("Staff notice was not sent.");
  }
}
