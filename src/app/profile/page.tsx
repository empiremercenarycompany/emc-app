import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { saveDisplayName } from "@/lib/actions/character";
import { saveIntake } from "@/lib/actions/intake";
import { signOut } from "@/lib/actions/staff";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { TIMESLOT_FALLBACK } from "@/lib/rules/intake";
import { recruitName } from "@/lib/recruit-name";

export default async function ProfilePage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const squadName =
    supabase && viewer.character?.squad_id
      ? (await supabase.from("squads").select("name").eq("id", viewer.character.squad_id).maybeSingle()).data?.name ?? null
      : null;
  const slots = supabase
    ? (await supabase.from("session_timeslots").select("id, label, adults_only").order("start_time")).data
    : null;
  const times =
    slots && slots.length > 0
      ? slots
      : TIMESLOT_FALLBACK.map((slot) => ({ id: slot.id, label: slot.label, adults_only: slot.adultsOnly }));
  const timeLabel = times.find((slot) => slot.id === viewer.intake?.timeslotId)?.label ?? "Not chosen";
  const shownName = recruitName({
    characterName: viewer.character?.name,
    displayName: viewer.displayName,
    email: viewer.email,
  });
  const initial = shownName.charAt(0).toUpperCase();
  const storedName = (viewer.displayName ?? "").trim();
  const mailbox = (viewer.email ?? "").split("@")[0]?.trim().toLowerCase();
  const nameField = storedName && storedName.toLowerCase() !== mailbox && !storedName.includes("@") ? storedName : "";

  return (
    <Page title="Profile" lede="Who the Company sees when you walk in.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.userId ? (
        <Link className="button primary" href="/sign-in">
          Sign in
        </Link>
      ) : (
        <>
          <Panel>
            <div className="identity">
              {viewer.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="avatar" src={viewer.avatarUrl} alt="" />
              ) : (
                <span className="avatar" aria-hidden="true">
                  {initial}
                </span>
              )}
              <span className="recruit-name">{shownName}</span>
            </div>
            <p>{squadName ?? "No squad yet"}</p>
            <p>Preferred time {timeLabel}</p>
          </Panel>
          <Panel title="Your name">
            <ResultForm action={saveDisplayName} submit="Save name">
              <label>
                What the Company calls you
                <input name="display_name" defaultValue={nameField} maxLength={80} />
              </label>
            </ResultForm>
          </Panel>
          {viewer.intake ? (
            <Panel title="Reminders">
              <p className="text-mute">The Company keeps this preference. This app does not send mail.</p>
              <ResultForm action={saveIntake} submit="Save reminders">
                <input type="hidden" name="dnd" value={viewer.intake.dnd} />
                <input type="hidden" name="gym" value={viewer.intake.gym} />
                <input type="hidden" name="timeslot" value={viewer.intake.timeslotId ?? ""} />
                {viewer.intake.goals.map((goal) => (
                  <input key={goal} type="hidden" name="goal" value={goal} />
                ))}
                <label className="choice">
                  <input type="checkbox" name="reminders" value="on" defaultChecked={viewer.intake.reminders} />
                  <span className="choice-mark" aria-hidden="true" />
                  <span className="choice-label">Session reminders</span>
                </label>
              </ResultForm>
            </Panel>
          ) : (
            <Panel title="About you">
              <Link href="/intake">Tell us about you</Link>
            </Panel>
          )}
          <form action={signOut}>
            <button className="secondary" type="submit">
              Sign out
            </button>
          </form>
        </>
      )}
    </Page>
  );
}
