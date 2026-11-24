import { COMPANY_ZONE } from "@/lib/rules/dates";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment past due",
  canceled: "Canceled",
  unpaid: "Unpaid",
  incomplete: "Waiting for payment",
  incomplete_expired: "Payment not finished",
  paused: "Paused",
};

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function formatPeriodEnd(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: COMPANY_ZONE,
  }).format(date);
}
