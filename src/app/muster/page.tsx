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
  const people =
    supabase && viewer.guildId && isStaff(viewer.role)
      ? (await supabase.from("characters").select("id, name").eq("guild_id", viewer.guildId).order("name")).data
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
        <p className="text-mute">Enter the week. Only what is not already logged is added. Then approve the squad.</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li>Name</li>
          <li>Workouts</li>
          <li>Nutrition and sleep</li>
          <li>Mental</li>
          <li>Social</li>
        </ul>
        {(people ?? []).length === 0 ? <p>No roster loaded.</p> : null}
        <ul>
          {(people ?? []).map((person) => (
            <li key={person.id}>{person.name}</li>
          ))}
        </ul>
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
            <label>
              Recruit
              <select name="character_id" required defaultValue="">
                <option value="" disabled>
                  Name
                </option>
                {(people ?? []).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Workouts
              <input name="workouts" inputMode="numeric" defaultValue="0" />
            </label>
            <label>
              Nutrition and sleep
              <input name="nutrition" inputMode="numeric" defaultValue="0" />
            </label>
            <label>
              Mental
              <input name="mental" inputMode="numeric" defaultValue="0" />
            </label>
            <label>
              Social
              <input name="social" inputMode="numeric" defaultValue="0" />
            </label>
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
