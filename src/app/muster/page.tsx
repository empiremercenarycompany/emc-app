import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { approveSquadMuster, recordMuster } from "@/lib/actions/muster";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/types";

export default async function MusterPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const sessions =
    supabase && viewer.guildId && isStaff(viewer.role)
      ? (
          await supabase
            .from("sessions")
            .select("id, title, session_date")
            .eq("guild_id", viewer.guildId)
            .order("session_date", { ascending: false })
        ).data
      : [];
  const squads =
    supabase && viewer.guildId && isStaff(viewer.role)
      ? (await supabase.from("squads").select("id, name").eq("guild_id", viewer.guildId).order("name")).data
      : [];

  return (
    <Page title="Table Muster" lede="In-person check-in before the episode. Confirm the week, then approve the squad.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.userId ? (
        <p>
          <Link href="/sign-in">Sign in</Link>. This screen is for staff at the table.
        </p>
      ) : null}
      {viewer.userId && !isStaff(viewer.role) ? <p>A player account cannot run Table Muster.</p> : null}
      <Panel title="Session and squad">
        <form className="flex flex-col gap-3" id="muster-filters">
          <label>
            Session
            <select name="session_id" defaultValue="">
              <option value="">Choose a session</option>
              {(sessions ?? []).map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title}
                  {session.session_date ? ` · ${session.session_date}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Squad
            <select name="squad_id" defaultValue="">
              <option value="">Choose a squad</option>
              {(squads ?? []).map((squad) => (
                <option key={squad.id} value={squad.id}>
                  {squad.name}
                </option>
              ))}
            </select>
          </label>
        </form>
      </Panel>
      <Panel title="Roster">
        <p className="text-mute">
          Workouts, nutrition and sleep, mental, and social. Only the gap that is not already logged this week is
          created.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Workouts</th>
                <th>Nutrition and sleep</th>
                <th>Mental</th>
                <th>Social</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Roster</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
              </tr>
            </tbody>
          </table>
        </div>
        {isStaff(viewer.role) ? (
          <ResultForm action={recordMuster} submit="Record muster">
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
            <select name="squad_id" required defaultValue="">
              <option value="" disabled>
                Squad
              </option>
              {(squads ?? []).map((squad) => (
                <option key={squad.id} value={squad.id}>
                  {squad.name}
                </option>
              ))}
            </select>
            <input name="character_id" required placeholder="Recruit id" />
            <input name="workouts" inputMode="numeric" defaultValue="0" />
            <input name="nutrition" inputMode="numeric" defaultValue="0" />
            <input name="mental" inputMode="numeric" defaultValue="0" />
            <input name="social" inputMode="numeric" defaultValue="0" />
          </ResultForm>
        ) : null}
        {isStaff(viewer.role) ? (
          <ResultForm action={approveSquadMuster} submit="Approve all">
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
            <select name="squad_id" required defaultValue="">
              <option value="" disabled>
                Squad
              </option>
              {(squads ?? []).map((squad) => (
                <option key={squad.id} value={squad.id}>
                  {squad.name}
                </option>
              ))}
            </select>
          </ResultForm>
        ) : (
          <button className="primary" type="button">
            Approve all
          </button>
        )}
      </Panel>
    </Page>
  );
}
