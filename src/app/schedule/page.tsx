import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { advanceMilestone } from "@/lib/actions/campaign";
import { awardBuff } from "@/lib/actions/muster";
import { clearSessions, induct, setAppRole, setCohortSession, setCohortStart, setLevel } from "@/lib/actions/staff";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/types";

export default async function SchedulePage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const windows =
    supabase ? (await supabase.from("cohort_sessions").select("session_number, start_date, end_date").order("session_number")).data : [];
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

  return (
    <Page title="Schedule" lede="Company time is America/Boise. Sessions are every other Saturday. An empty window list falls back to the cadence.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.userId ? <Link href="/sign-in">Sign in</Link> : null}
      <Panel title="Company clock">
        <p>Today {viewer.today ?? "—"} · {viewer.config?.time_zone ?? "America/Boise"}</p>
        <p>Next adventure {viewer.config?.cohort_start ?? "unset"} · posters {viewer.config?.posters_launch ?? "2027-01-04"}</p>
        <p>{viewer.config?.location_address ?? "1539 E Piper St, Idaho Falls, ID 83401"}</p>
        <p className="text-mute">
          Founding Recruit Rate $60/mo added to a gym membership, or $120/mo for non-members with membership included.
          Display only.
        </p>
        <p>
          Each week you can place {viewer.config?.weekly_point_cap ?? 4}, and {viewer.config?.pool_point_cap ?? 2} from one
          kind of work. The Build stops at {viewer.config?.point_buy_budget ?? 27}.
        </p>
        {viewer.session ? (
          <p>
            This session {viewer.session.session_number}: {viewer.session.start_date} to {viewer.session.end_date}
          </p>
        ) : (
          <p>Today is outside every window, or the cohort has not started.</p>
        )}
      </Panel>
      <Panel title="Windows">
        {(windows ?? []).length === 0 ? <p className="text-mute">No published windows. The 14-day cadence is the fallback.</p> : null}
        <ul>
          {(windows ?? []).map((window) => (
            <li key={window.session_number}>
              Session {window.session_number}: {window.start_date} to {window.end_date}
            </li>
          ))}
        </ul>
        <p className="text-sm text-mute">A longer row is a three-parter. A gap is an off-week. Work still records.</p>
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
            Induction opens at week {viewer.config?.induction_week ?? 6}. Every class row ships disabled. TODO(John): which
            martial classes open. A class that is not enabled is refused.
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
