import Link from "next/link";
import { IntakeForm } from "@/components/intake-form";
import { Notice, Page } from "@/components/ui";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { TIMESLOT_FALLBACK } from "@/lib/rules/intake";

export default async function IntakePage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const rows = supabase
    ? (await supabase.from("session_timeslots").select("id, label, adults_only").order("start_time")).data
    : null;
  const slots =
    rows && rows.length > 0
      ? rows.map((row) => ({ id: row.id, label: row.label, adultsOnly: Boolean(row.adults_only) }))
      : TIMESLOT_FALLBACK.map((slot) => ({ id: slot.id, label: slot.label, adultsOnly: slot.adultsOnly }));

  return (
    <Page title="About you" lede="This is you, not your character. Four short answers.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.userId ? (
        <p>
          <Link href="/sign-in">Sign in</Link> before you answer.
        </p>
      ) : null}
      <IntakeForm
        slots={slots}
        initial={
          viewer.intake
            ? {
                dnd: viewer.intake.dnd,
                gym: viewer.intake.gym,
                goals: viewer.intake.goals,
                timeslot: viewer.intake.timeslotId ?? slots[0]?.id ?? "morning",
                reminders: viewer.intake.reminders,
              }
            : undefined
        }
      />
    </Page>
  );
}
