import { playerPriceFailureMessage } from "@/lib/billing/price";
import type { NoticeField } from "@/lib/notify/signup-fields";
import { sendStaffNotice } from "@/lib/notify/staff-notice";
import type { StaffPaymentNotice } from "@/lib/billing/types";

export function paymentNotice(notice: StaffPaymentNotice): { subject: string; fields: NoticeField[] } {
  const fields: NoticeField[] = [
    { label: "Email", value: notice.email ?? "" },
    { label: "User id", value: notice.userId ?? "" },
    { label: "Plan", value: notice.planLookupKey ?? "" },
    { label: "Invoice", value: notice.invoiceId ?? "" },
    { label: "Subscription", value: notice.subscriptionId ?? "" },
  ];
  if (notice.wanderlust) fields.push({ label: "Wanderlust", value: "Add-on on this membership" });
  if (notice.shieldmate) fields.push({ label: "Shieldmate bonus", value: "Coupon shieldmate_20x2" });
  return {
    subject: notice.kind === "paid" ? "Payment completed" : "Payment failed",
    fields,
  };
}

export function billingQueryNotice(flag: string | undefined): string | null {
  switch (flag) {
    case "success":
      return "Payment received. Membership status updates when Stripe confirms it.";
    case "cancel":
      return "Checkout was canceled. No charge was made.";
    case "plan":
      return "Choose a membership plan.";
    case "portal":
      return "Start a membership before opening the billing portal.";
    case "portal-config":
      return "The billing portal is not set up in Stripe yet. Staff can add a Customer Portal configuration, then this link will open.";
    case "unavailable":
      return "Payment isn't open right now. Nothing was charged.";
    case "price-standard":
    case "price-member":
      return playerPriceFailureMessage();
    case "hold":
      return "We're checking your Empire membership. You'll pay $60 a month once staff confirm it. Nothing is charged until then.";
    case "closed":
      return "Checkout isn't available for this enlistment. Nothing was charged.";
    default:
      return null;
  }
}

/** Mail failures stay inside sendStaffNotice. The webhook still returns 200. */
export async function notifyStaffOfPayment(notice: StaffPaymentNotice): Promise<void> {
  const message = paymentNotice(notice);
  await sendStaffNotice(message.subject, message.fields);
}
