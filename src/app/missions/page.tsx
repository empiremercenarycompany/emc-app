import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { checkIn } from "@/lib/actions/activity";
import { logObjective } from "@/lib/actions/activity";
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
            .select("id, title, scheduled_at")
            .eq("guild_id", viewer.guildId)
            .order("scheduled_at", { ascending: false })
            .limit(8)
        ).data
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
              {session.scheduled_at ? ` · ${session.scheduled_at}` : ""}
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
            <input type="datetime-local" name="scheduled_at" />
            <textarea name="notes" placeholder="Notes" />
          </ResultForm>
        ) : null}
        <p className="text-sm text-mute">TODO(John): loot share is stored and does nothing else.</p>
      </Panel>
    </Page>
  );
}
