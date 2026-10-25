import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { checkIn } from "@/lib/actions/activity";
import { logObjective } from "@/lib/actions/activity";
import { correctAttendance } from "@/lib/actions/campaign";
import { createSession } from "@/lib/actions/staff";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export default async function MissionsPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const missions =
    supabase && viewer.guildId
      ? (
          await supabase
            .from("missions")
            .select("id, title, description, type, status, objectives(id, title, current_value, target_value, unit)")
            .eq("guild_id", viewer.guildId)
            .eq("status", "active")
        ).data
      : [];
  const sessions =
    supabase && viewer.guildId
      ? (
          await supabase
            .from("sessions")
            .select("id, title, session_date, scheduled_at")
            .eq("guild_id", viewer.guildId)
            .order("scheduled_at", { ascending: false })
            .limit(8)
        ).data
      : [];
  const people =
    supabase && viewer.guildId && viewer.role === "dm"
      ? (await supabase.from("characters").select("id, name").eq("guild_id", viewer.guildId)).data
      : [];

  return (
    <Page title="Missions" lede="Contracts, barracks challenges, and table check-in.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.userId ? <Link href="/sign-in">Sign in</Link> : null}
      {(missions ?? []).length === 0 ? <p className="text-mute">No active missions.</p> : null}
      {(missions ?? []).map((mission) => (
        <Panel key={mission.id} title={mission.title}>
          <p className="text-mute">{mission.type}</p>
          {mission.description ? <p>{mission.description}</p> : null}
          {(mission.objectives ?? []).map(
            (objective: { id: string; title: string; current_value: number; target_value: number | null; unit: string | null }) => (
              <div key={objective.id}>
                <p>
                  {objective.title}: {objective.current_value}
                  {objective.target_value != null ? ` / ${objective.target_value}` : ""} {objective.unit ?? ""}
                </p>
                {viewer.character ? (
                  <ResultForm action={logObjective} submit="Add progress">
                    <input type="hidden" name="objective_id" value={objective.id} />
                    <input name="amount" inputMode="numeric" defaultValue="1" />
                    <input name="note" placeholder="Note" />
                  </ResultForm>
                ) : null}
              </div>
            ),
          )}
        </Panel>
      ))}
      <Panel title="Table">
        {(sessions ?? []).map((session) => (
          <div key={session.id}>
            <p>
              {session.title}
              {session.session_date ? ` · ${session.session_date}` : ""}
              {session.scheduled_at && !session.session_date ? ` · ${session.scheduled_at}` : ""}
            </p>
            {viewer.character ? (
              <ResultForm action={checkIn} submit="Check in">
                <input type="hidden" name="session_id" value={session.id} />
              </ResultForm>
            ) : null}
          </div>
        ))}
        {viewer.role === "dm" ? (
          <ResultForm action={createSession} submit="Add a table">
            <input name="title" required placeholder="Title" />
            <input type="date" name="session_date" required />
            <textarea name="notes" placeholder="Note the table can read" />
          </ResultForm>
        ) : null}
        <p className="text-sm text-mute">
          Attendance loot is {viewer.config?.attendance_loot ?? "unset"}. Check-in copies that placeholder and grants nothing.
          TODO(John): what it should pay. Group-goal payout is {viewer.config?.group_goal_payout ?? "unset"}.
        </p>
        {viewer.role === "dm" ? (
          <ResultForm action={correctAttendance} submit="Correct attendance" secondary>
            <select name="session_id" required defaultValue="">
              <option value="" disabled>
                Session
              </option>
              {(sessions ?? []).map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title}
                </option>
              ))}
            </select>
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
            <select name="present" defaultValue="true">
              <option value="true">Present</option>
              <option value="false">Absent</option>
            </select>
            <select name="loot_share" defaultValue="true">
              <option value="true">Loot flag on</option>
              <option value="false">Loot flag off</option>
            </select>
          </ResultForm>
        ) : null}
      </Panel>
    </Page>
  );
}
