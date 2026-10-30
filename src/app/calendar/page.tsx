import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { checkIn } from "@/lib/actions/activity";
import { saveCalendarEvent } from "@/lib/actions/campaign";
import { createSession } from "@/lib/actions/staff";
import { loadViewer, setupMessage } from "@/lib/company";
import { calendarBlocks, sampleCalendar, type CalendarBlock } from "@/lib/rules/calendar";
import { parseDate } from "@/lib/rules/dates";
import type { CohortSession } from "@/lib/rules/progression";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/types";

const KIND_LABEL: Record<CalendarBlock["kind"], string> = {
  session: "Session",
  "off-week": "Off-week",
  "three-parter": "Three-parter",
};

function BlockList({ blocks }: { blocks: CalendarBlock[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {blocks.map((block) => (
        <li key={`${block.start}-${block.kind}-${block.sessionNumber ?? "gap"}`} className="border border-steel p-2">
          <p>
            {KIND_LABEL[block.kind]}
            {block.sessionNumber != null ? ` ${block.sessionNumber}` : ""} · {block.start} to {block.end}
          </p>
          {block.markers.length > 0 ? <p className="text-mute">{block.markers.join(" · ")}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export default async function CalendarPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const windows =
    supabase && viewer.userId
      ? (await supabase.from("cohort_sessions").select("session_number, start_date, end_date").order("session_number")).data
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

  const schedule: CohortSession[] = (windows ?? []).map((row) => ({
    number: row.session_number,
    start: parseDate(String(row.start_date)),
    end: parseDate(String(row.end_date)),
  }));
  const live =
    viewer.config != null
      ? calendarBlocks({
          anchor: parseDate(viewer.config.cohort_start),
          throughWeek: Math.max(viewer.config.level_three_week ?? 32, viewer.config.adventure_weeks ?? 16),
          sessionLengthDays: viewer.config.session_length_days,
          schedule,
          inductionWeek: viewer.config.induction_week,
          levelTwoWeek: viewer.config.level_two_week ?? 16,
          levelThreeWeek: viewer.config.level_three_week ?? 32,
        })
      : [];

  return (
    <Page
      title="Calendar"
      lede="Company dates use America/Denver. A longer row is a three-parter and shares one cap. A gap is an off-week and earns nothing."
    >
      {setup ? <Notice>{setup}</Notice> : null}
      <Panel title="How a window reads">
        <p className="text-mute">This sample is not the company schedule. It shows the two shapes staff can publish.</p>
        <BlockList blocks={sampleCalendar()} />
      </Panel>
      {viewer.userId && viewer.config ? (
        <Panel title="Company calendar">
          <p className="text-mute">
            Cohort placeholder {viewer.config.cohort_start}. Induction week {viewer.config.induction_week}. Level 2 week{" "}
            {viewer.config.level_two_week ?? 16}. Level 3 week {viewer.config.level_three_week ?? 32}.
          </p>
          {(windows ?? []).length === 0 ? (
            <p className="text-mute">No published windows. The 14-day cadence is the fallback.</p>
          ) : null}
          <BlockList blocks={live} />
        </Panel>
      ) : (
        <p>
          <Link href="/sign-in">Sign in</Link> to read the company calendar.
        </p>
      )}
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
        <p className="text-sm text-mute">
          Attendance stores a reward placeholder ({viewer.config?.attendance_loot ?? "unset"}) and grants nothing. TODO(John):
          what attendance pays.
        </p>
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
    </Page>
  );
}
