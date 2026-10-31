import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { checkIn } from "@/lib/actions/activity";
import { advanceMilestone, saveCalendarEvent } from "@/lib/actions/campaign";
import { awardBuff } from "@/lib/actions/muster";
import { clearSessions, createSession, induct, setAppRole, setCohortSession, setCohortStart, setLevel, setSubclass } from "@/lib/actions/staff";
import { loadViewer, setupMessage } from "@/lib/company";
import { calendarBlocks, nextSessionBlock, type CalendarBlock, type SessionFocus } from "@/lib/rules/calendar";
import { COMPANY_ZONE, calendarDate, formatDate, parseDate } from "@/lib/rules/dates";
import { TIMESLOT_FALLBACK } from "@/lib/rules/intake";
import type { CohortSession } from "@/lib/rules/progression";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/types";

const KIND_LABEL: Record<CalendarBlock["kind"], string> = {
  session: "Session",
  "off-week": "Off-week",
  "three-parter": "Three-parter",
};

function slotText(slot: { label: string; adultsOnly: boolean }): string {
  return slot.adultsOnly ? `${slot.label} (18+)` : slot.label;
}

function blockMark(block: CalendarBlock, focus: SessionFocus | null): string | null {
  if (!focus) return null;
  if (focus.block.start !== block.start || focus.block.end !== block.end || focus.block.kind !== block.kind) return null;
  return focus.when === "now" ? "Now" : "Next";
}

function BlockList({ blocks, focus }: { blocks: CalendarBlock[]; focus: SessionFocus | null }) {
  return (
    <ul className="flex flex-col gap-2">
      {blocks.map((block) => {
        const mark = blockMark(block, focus);
        return (
          <li
            key={`${block.start}-${block.kind}-${block.sessionNumber ?? "gap"}`}
            className={mark ? "border border-bronze p-2" : "border border-steel p-2"}
          >
            <p>
              {KIND_LABEL[block.kind]}
              {block.sessionNumber != null ? ` ${block.sessionNumber}` : ""}
              {mark ? ` · ${mark}` : ""} · {block.start} to {block.end}
            </p>
            {block.markers.length > 0 ? <p className="text-mute">{block.markers.join(" · ")}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

export default async function SchedulePage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const windows =
    supabase && viewer.userId
      ? (await supabase.from("cohort_sessions").select("session_number, start_date, end_date").order("session_number")).data
      : [];
  const slotRows = supabase
    ? (await supabase.from("session_timeslots").select("id, label, adults_only").order("start_time")).data
    : null;
  const slots =
    slotRows && slotRows.length > 0
      ? slotRows.map((slot) => ({ id: String(slot.id), label: String(slot.label), adultsOnly: Boolean(slot.adults_only) }))
      : TIMESLOT_FALLBACK.map((slot) => ({ id: slot.id, label: slot.label, adultsOnly: slot.adultsOnly }));
  const notes =
    supabase && isStaff(viewer.role)
      ? (await supabase.from("config_notes").select("key, note").order("key")).data
      : [];
  const people =
    supabase && viewer.guildId && isStaff(viewer.role)
      ? (await supabase.from("characters").select("id, name, user_id, class, level").eq("guild_id", viewer.guildId)).data
      : [];
  const classes =
    supabase && viewer.role === "dm"
      ? (await supabase.from("induction_classes").select("id, name, enabled").order("name")).data
      : [];
  const tables =
    supabase && viewer.guildId
      ? (
          await supabase
            .from("sessions")
            .select("id, title, session_date, off_week, cohort_session_number, notes")
            .eq("guild_id", viewer.guildId)
            .order("session_date", { ascending: true })
        ).data
      : [];
  const events =
    supabase && viewer.guildId
      ? (
          await supabase
            .from("calendar_events")
            .select("id, title, description, type, start_time")
            .eq("guild_id", viewer.guildId)
            .order("start_time", { ascending: true })
        ).data
      : [];
  const squads =
    supabase && viewer.guildId && isStaff(viewer.role)
      ? (await supabase.from("squads").select("id, name").eq("guild_id", viewer.guildId)).data
      : [];

  const published: CohortSession[] = (windows ?? []).map((row) => ({
    number: row.session_number,
    start: parseDate(String(row.start_date)),
    end: parseDate(String(row.end_date)),
  }));
  const live =
    viewer.userId && viewer.config
      ? calendarBlocks({
          anchor: parseDate(viewer.config.cohort_start),
          throughWeek: Math.max(viewer.config.level_three_week ?? 32, viewer.config.adventure_weeks ?? 16),
          sessionLengthDays: viewer.config.session_length_days,
          schedule: published,
          inductionWeek: viewer.config.induction_week,
          levelTwoWeek: viewer.config.level_two_week ?? 16,
          levelThreeWeek: viewer.config.level_three_week ?? 32,
        })
      : [];
  const today = viewer.today ?? formatDate(calendarDate(new Date(), COMPANY_ZONE));
  const focus = nextSessionBlock(live, today);
  const yours = slots.find((slot) => slot.id === viewer.intake?.timeslotId) ?? null;

  return (
    <Page title="Schedule" lede="Sessions are every other Saturday. An off-week still lets you record work.">
      {setup ? <Notice>{setup}</Notice> : null}
      <Panel title="Next session">
        <p>Today {today}</p>
        {focus ? (
          <p>
            {focus.when === "now" ? "This session" : "Next session"}
            {focus.block.sessionNumber != null ? ` ${focus.block.sessionNumber}` : ""}: {focus.block.start} to{" "}
            {focus.block.end}
          </p>
        ) : viewer.userId ? (
          <p>No session is on the calendar after today. You can still record work.</p>
        ) : (
          <p>
            <Link href="/sign-in">Sign in</Link> to see the next session.
          </p>
        )}
        {focus && focus.block.markers.length > 0 ? <p className="text-mute">{focus.block.markers.join(" · ")}</p> : null}
        <p>{viewer.config?.location_address ?? "1539 E Piper St, Idaho Falls, ID 83401"}</p>
        <p className="text-mute">Posters {viewer.config?.posters_launch ?? "2027-01-04"}</p>
      </Panel>
      <Panel title="Times">
        <ul className="flex flex-col gap-2">
          {slots.map((slot) => {
            const chosen = yours?.id === slot.id;
            return (
              <li key={slot.id} className={chosen ? "border border-bronze p-2" : "border border-steel p-2"}>
                {slotText(slot)}
                {chosen ? " · Yours" : ""}
              </li>
            );
          })}
        </ul>
        {yours ? <p>Your time is {slotText(yours)}.</p> : null}
        {viewer.userId && !yours ? (
          <p>
            <Link href="/intake">Pick a time</Link> so your trainer knows when you can come.
          </p>
        ) : null}
      </Panel>
      <Panel title="Company calendar">
        <p className="text-mute">A longer row is a three-parter: one session. A gap is an off-week. You can still record work.</p>
        {viewer.userId && viewer.config ? (
          <>
            <p className="text-mute">
              Starts {viewer.config.cohort_start}. Induction week {viewer.config.induction_week}. Level 2 week{" "}
              {viewer.config.level_two_week ?? 16}. Level 3 week {viewer.config.level_three_week ?? 32}.
            </p>
            {(windows ?? []).length === 0 ? (
              <p className="text-mute">No published windows. The 14-day cadence is the fallback.</p>
            ) : null}
            <BlockList blocks={live} focus={focus} />
          </>
        ) : viewer.userId ? (
          <p className="text-mute">The schedule is not set yet.</p>
        ) : (
          <p>
            <Link href="/sign-in">Sign in</Link> to read the company calendar.
          </p>
        )}
      </Panel>
      <Panel title="Each week">
        <p>
          Each week, {viewer.config?.weekly_point_cap ?? 4} logs can count, and {viewer.config?.pool_point_cap ?? 2} from
          one kind of work.
        </p>
        <p className="text-mute">
          Founding Recruit Rate $60/mo added to a gym membership, or $120/mo for non-members with membership included. No
          payments are taken in the app.
        </p>
      </Panel>
      <Panel title="Table sessions">
        {(tables ?? []).length === 0 ? <p className="text-mute">No table sessions yet.</p> : null}
        {(tables ?? []).map((session) => (
          <article key={session.id}>
            <p>
              {session.title}
              {session.session_date ? ` · ${session.session_date}` : ""}
              {session.off_week ? " · Off-week" : ""}
              {session.cohort_session_number != null ? ` · Window ${session.cohort_session_number}` : ""}
            </p>
            {session.notes ? <p className="text-mute">{session.notes}</p> : null}
            {viewer.character ? (
              <ResultForm action={checkIn} submit="Check in">
                <input type="hidden" name="session_id" value={session.id} />
              </ResultForm>
            ) : null}
          </article>
        ))}
        <p className="text-sm text-mute">Checking in records that you were there.</p>
        {isStaff(viewer.role) ? (
          <ResultForm action={createSession} submit="Save session">
            <input name="title" required placeholder="Title" />
            <input type="date" name="session_date" required />
            <select name="squad_id" defaultValue="">
              <option value="">Whole company</option>
              {(squads ?? []).map((squad) => (
                <option key={squad.id} value={squad.id}>
                  {squad.name}
                </option>
              ))}
            </select>
            <textarea name="notes" placeholder="Note the table can read" />
          </ResultForm>
        ) : null}
      </Panel>
      <Panel title="Other marks">
        {(events ?? []).length === 0 ? <p className="text-mute">Nothing else marked.</p> : null}
        {(events ?? []).map((event) => (
          <p key={event.id}>
            {event.type} · {event.title}
            {event.start_time ? ` · ${String(event.start_time).slice(0, 10)}` : ""}
          </p>
        ))}
        {isStaff(viewer.role) ? (
          <ResultForm action={saveCalendarEvent} submit="Add mark">
            <input name="title" required placeholder="Title" />
            <select name="type" defaultValue="training">
              <option value="session">Session</option>
              <option value="training">Training</option>
              <option value="meeting">Meeting</option>
              <option value="milestone">Milestone</option>
            </select>
            <input type="date" name="start" required />
            <textarea name="description" placeholder="Description" />
          </ResultForm>
        ) : null}
      </Panel>
      <Panel title="Buff menu">
        <ul>
          <li>Heroic inspiration · one use</li>
          <li>+2 damage on one attack · one use</li>
          <li>Advantage on one check · one session</li>
        </ul>
        <p className="text-mute">The DM awards these. They do not change the Build.</p>
      </Panel>
      {isStaff(viewer.role) ? (
        <Panel title="Staff">
          <p>The Build stops at {viewer.config?.point_buy_budget ?? 27}.</p>
          <ResultForm action={setCohortStart} submit="Set cohort start">
            <input type="date" name="start" required />
          </ResultForm>
          <ResultForm action={setCohortSession} submit="Save window">
            <input name="number" required inputMode="numeric" placeholder="Session number" />
            <input type="date" name="start" required />
            <input type="date" name="end" required />
          </ResultForm>
          <ResultForm action={clearSessions} submit="Clear windows" secondary>
            <input type="hidden" name="confirm" value="yes" />
          </ResultForm>
          <ResultForm action={awardBuff} submit="Award buff">
            <select name="character_id" required defaultValue="">
              <option value="" disabled>
                Character
              </option>
              {(people ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            <select name="buff_id" defaultValue="heroic_inspiration">
              <option value="heroic_inspiration">Heroic inspiration</option>
              <option value="damage_plus_two">+2 damage on one attack</option>
              <option value="advantage_one_check">Advantage on one check</option>
            </select>
            <input name="session_id" placeholder="Session id, if it lasts the session" />
            <textarea name="note" placeholder="Note" />
          </ResultForm>
          <p className="text-sm text-mute">A buff expires after one use or at the end of the session. It does not raise an ability.</p>
        </Panel>
      ) : null}
      {viewer.role === "dm" ? (
        <Panel title="Induction and roles">
          <ResultForm action={induct} submit="Record induction">
            <select name="character_id" required defaultValue="">
              <option value="" disabled>
                Character
              </option>
              {(people ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            <select name="class_name" defaultValue="">
              <option value="">No class yet</option>
              {(classes ?? [])
                .filter((row) => row.enabled)
                .map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
            </select>
          </ResultForm>
          <p className="text-sm text-mute">
            Induction opens at week {viewer.config?.induction_week ?? 6}. A class that is not enabled is refused.
          </p>
          <ResultForm action={setLevel} submit="Set level">
            <select name="character_id" required defaultValue="">
              <option value="" disabled>
                Character
              </option>
              {(people ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            <input name="level" required inputMode="numeric" placeholder="Level" />
          </ResultForm>
          <p className="text-sm text-mute">A level change is written down. It does not move the Build.</p>
          <ResultForm action={setSubclass} submit="Save subclass">
            <select name="character_id" required defaultValue="">
              <option value="" disabled>
                Character
              </option>
              {(people ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            <label>
              Subclass name
              <input name="subclass_name" />
            </label>
            <label>
              Features
              <textarea name="subclass_features" />
            </label>
            <label>
              Spells
              <textarea name="subclass_spells" />
            </label>
          </ResultForm>
          <p className="text-sm text-mute">Write the name and what it does. Leave it blank until you decide. Homebrew names are allowed. Do not paste book text.</p>
          <ResultForm action={setAppRole} submit="Set role">
            <input name="user_id" required placeholder="User id" />
            <select name="role" defaultValue="player">
              <option value="player">Player</option>
              <option value="dm">DM</option>
              <option value="admin">Admin</option>
              <option value="curator">Curator</option>
            </select>
          </ResultForm>
        </Panel>
      ) : null}
      {isStaff(viewer.role) ? (
        <Panel title="Milestones">
          <p className="text-mute">
            Level {viewer.config?.level_after_adventure_1 ?? 2} opens at week {viewer.config?.level_two_week ?? 16}. Level{" "}
            {viewer.config?.level_after_adventure_2 ?? 3} opens at week {viewer.config?.level_three_week ?? 32}. Staff
            record one step at a time. Nothing levels by itself, and a milestone does not lower a level.
          </p>
          <ResultForm action={advanceMilestone} submit="Record milestone">
            <select name="character_id" required defaultValue="">
              <option value="" disabled>
                Character
              </option>
              {(people ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </ResultForm>
        </Panel>
      ) : null}
      {isStaff(viewer.role) ? (
        <Panel title="Open settings">
          <ul className="flex flex-col gap-2">
            {(notes ?? []).map((note) => (
              <li key={note.key}>
                <span className="text-mute">{note.key}. </span>
                {note.note}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </Page>
  );
}
