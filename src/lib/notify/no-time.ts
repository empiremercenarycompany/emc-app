import { SATURDAY_TABLE_COPY } from "@/content/saturday-tables";
import type { NoticeField } from "@/lib/notify/signup-fields";

/** Owner inbox. Staff mail uses this address. Players are not emailed. */
export const OWNER_ALERT_EMAIL = SATURDAY_TABLE_COPY.askStaffEmail;

export const NO_TIME_SUBJECT = "No Saturday time available";

/** Owner alert only. It does not describe a refund to the player. */
export function noTimeNotice(input: { email: string; name: string; table: string }): NoticeField[] {
  return [
    { label: "What happened", value: "Staff could not place this recruit in a Saturday time." },
    { label: "Email", value: input.email },
    { label: "Name", value: input.name },
    { label: "Table", value: input.table || "Not chosen" },
    {
      label: "Next",
      value:
        "Talk to the player. If money should go back, the owner does that manually outside the app. The player is not emailed.",
    },
  ];
}
