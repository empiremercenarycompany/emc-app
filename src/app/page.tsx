import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Choice } from "@/components/choice";
import { Notice, Page, Panel } from "@/components/ui";
import { postAnnouncement } from "@/lib/actions/staff";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { currentWeekStart } from "@/lib/rules/dates";
import { workoutMark } from "@/lib/rules/checkin";
import { TIMESLOT_FALLBACK } from "@/lib/rules/intake";
import { isStaff } from "@/lib/types";

export default async function BarracksPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  let announcements: { id: string; title: string; body: string; pinned: boolean; squads: { name: string } | { name: string }[] | null }[] = [];
  const squads =
    supabase && viewer.guildId && isStaff(viewer.role)
      ? (await supabase.from("squads").select("id, name").eq("guild_id", viewer.guildId)).data
      : [];
  if (supabase && viewer.guildId) {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, body, pinned, squads(name)")
      .eq("guild_id", viewer.guildId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);
    announcements = data ?? [];
  }

  const weekStart = currentWeekStart(viewer.today);
  const checkin =
    supabase && viewer.character
      ? (
          await supabase
            .from("weekly_checkins")
            .select("week_start, score, override_score, workouts, wis, int_mark, cha")
            .eq("character_id", viewer.character.id)
            .eq("week_start", weekStart)
            .maybeSingle()
        ).data
      : null;
  const squadName =
    supabase && viewer.character?.squad_id
      ? (await supabase.from("squads").select("name").eq("id", viewer.character.squad_id).maybeSingle()).data?.name ?? null
      : null;
  const slotRows = supabase ? (await supabase.from("session_timeslots").select("label, adults_only").order("start_time")).data : null;
  const times =
    slotRows && slotRows.length > 0
      ? slotRows.map((slot) => (slot.adults_only ? `${slot.label} (18+)` : slot.label)).join(", ")
      : TIMESLOT_FALLBACK.map((slot) => (slot.adultsOnly ? `${slot.label} (18+)` : slot.label)).join(", ");
  const weekMark = checkin ? (checkin.override_score ?? checkin.score) : null;

  return (
    <Page title="Barracks" lede="A squad, a story, and a reason to keep showing up.">
      <p className="text-mute">Train. Record. Advance.</p>
      <p>Your week shapes your character and the story.</p>
      {setup ? <Notice>{setup}</Notice> : null}
      {viewer.beginner ? (
        <Notice>New here? Check in once a week, record the work you did, and your trainer handles the numbers.</Notice>
      ) : null}
      {!viewer.character ? (
        <Panel title="Start here">
          <ol className="list-decimal pl-5">
            <li>Join the Company</li>
            <li>Fill Out Recruitment Papers</li>
            <li>Record work</li>
          </ol>
          {!viewer.userId ? (
            <Link className="button primary" href="/sign-in">
              Join the Company
            </Link>
          ) : (
            <Link className="button primary" href="/character/new">
              Fill Out Recruitment Papers
            </Link>
          )}
        </Panel>
      ) : (
        <Panel title="This week">
          <p>
            {viewer.character.name}
            {squadName ? ` · ${squadName}` : " · No squad yet"}
          </p>
          {viewer.session ? (
            <p>
              Next session {viewer.session.start_date} to {viewer.session.end_date}. Times {times}.
            </p>
          ) : (
            <p className="text-mute">No session covers today. Logs still save. Times {times}.</p>
          )}
          <ul className="ability-row">
            <ScorePill label="Workouts" value={checkin ? String(workoutMark(checkin.workouts)) : "—"} />
            <ScorePill label="Wisdom" value={checkin ? (checkin.wis ? "Met" : "Missed") : "—"} />
            <ScorePill label="Intelligence" value={checkin ? (checkin.int_mark ? "Met" : "Missed") : "—"} />
            <ScorePill label="Charisma" value={checkin ? (checkin.cha ? "Met" : "Missed") : "—"} />
          </ul>
          <p>{weekMark == null ? "Not checked in yet." : `Week mark ${weekMark}.`}</p>
          {weekMark == null ? (
            <Link className="button primary" href="/check-in">
              Check in
            </Link>
          ) : (
            <Link className="button primary" href="/work">
              Record work
            </Link>
          )}
        </Panel>
      )}
      {viewer.userId && !viewer.intake ? (
        <Panel title="About you">
          <p>A few questions help your trainer meet you where you are.</p>
          <Link className="button" href="/intake">
            Tell us about you
          </Link>
        </Panel>
      ) : null}
      <Panel title="Announcements">
        {announcements.length === 0 ? <p className="text-mute">Nothing posted.</p> : null}
        {announcements.map((item) => {
          const squad = Array.isArray(item.squads) ? item.squads[0] : item.squads;
          return (
            <article key={item.id}>
              <h2>
                {item.pinned ? "Pinned · " : ""}
                {item.title}
              </h2>
              <p className="text-mute">{squad ? squad.name : "Company"}</p>
              <p>{item.body}</p>
            </article>
          );
        })}
        {isStaff(viewer.role) ? (
          <ResultForm action={postAnnouncement} submit="Post">
            <label>
              Title
              <input name="title" required />
            </label>
            <label>
              Body
              <textarea name="body" required />
            </label>
            <label>
              Who sees it
              <select name="squad_id" defaultValue="">
                <option value="">Whole company</option>
                {(squads ?? []).map((squad) => (
                  <option key={squad.id} value={squad.id}>
                    {squad.name}
                  </option>
                ))}
              </select>
            </label>
            <Choice name="pinned">Pin</Choice>
          </ResultForm>
        ) : null}
      </Panel>
    </Page>
  );
}

function ScorePill({ label, value }: { label: string; value: string }) {
  return (
    <li className="score-pill">
      <span>{label}</span>
      <span className="ability-score">{value}</span>
    </li>
  );
}
