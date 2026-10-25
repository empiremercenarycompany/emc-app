import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { assignSquad, createSquad, postChallenge } from "@/lib/actions/staff";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export default async function SquadPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const squads =
    supabase && viewer.guildId
      ? (await supabase.from("squads").select("id, name, max_size").eq("guild_id", viewer.guildId)).data
      : [];
  const people =
    supabase && viewer.guildId
      ? (await supabase.from("characters").select("id, name, rank, squad_id").eq("guild_id", viewer.guildId)).data
      : [];
  const shared =
    supabase && viewer.character?.squad_id
      ? (
          await supabase
            .from("lifting_sessions")
            .select("id, date, points_awarded, character_id, lifting_sets(reps, weight, is_pr, exercises(name))")
            .eq("share_with_squad", true)
            .order("date", { ascending: false })
            .limit(12)
        ).data
      : [];
  const cap = viewer.config?.squad_max_size ?? 6;
  const canLead = viewer.role === "dm" || viewer.role === "admin";

  return (
    <Page title="Squad" lede={`Company cap is ${cap}. TODO(John): 5 or 6.`}>
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.userId ? <Link href="/sign-in">Sign in</Link> : null}
      {(squads ?? []).map((squad) => {
        const members = (people ?? []).filter((person) => person.squad_id === squad.id);
        return (
          <Panel key={squad.id} title={squad.name}>
            <p className="text-mute">
              {members.length} / {Math.min(squad.max_size, cap)}
            </p>
            <ul>
              {members.map((member) => (
                <li key={member.id}>
                  {member.name} · {member.rank}
                </li>
              ))}
            </ul>
          </Panel>
        );
      })}
      {(squads ?? []).length === 0 ? <p className="text-mute">No squads yet.</p> : null}
      {canLead ? (
        <Panel title="Lead">
          <ResultForm action={createSquad} submit="Create squad">
            <input name="name" required placeholder="Squad name" />
            <input name="max" inputMode="numeric" placeholder={`Max, or blank for ${cap}`} />
          </ResultForm>
          <ResultForm action={assignSquad} submit="Assign">
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
            <select name="squad_id" defaultValue="">
              <option value="">Unassigned</option>
              {(squads ?? []).map((squad) => (
                <option key={squad.id} value={squad.id}>
                  {squad.name}
                </option>
              ))}
            </select>
          </ResultForm>
          <ResultForm action={postChallenge} submit="Post group goal">
            <select name="squad_id" defaultValue="">
              <option value="">Whole company</option>
              {(squads ?? []).map((squad) => (
                <option key={squad.id} value={squad.id}>
                  {squad.name}
                </option>
              ))}
            </select>
            <input name="title" required placeholder="Challenge title" />
            <textarea name="description" placeholder="Description" />
            <input name="objective_title" placeholder="Objective" />
            <input name="objective_target" placeholder="Target" />
            <input name="objective_unit" placeholder="Unit" />
          </ResultForm>
          <p className="text-sm text-mute">Group goals are barracks missions. Progress does not change attributes. TODO(John): a separate reward.</p>
        </Panel>
      ) : null}
      <Panel title="Shared lifts">
        {(shared ?? []).length === 0 ? <p className="text-mute">No shared sessions.</p> : null}
        {(shared ?? []).map((session) => (
          <article key={session.id}>
            <p>
              {session.date} · {session.points_awarded > 0 ? "counted toward the work" : "saved"}
            </p>
            <ul>
              {(session.lifting_sets ?? []).map(
                (set: { reps: number | null; weight: number | null; is_pr: boolean; exercises: { name: string } | { name: string }[] | null }, index: number) => {
                  const exercise = Array.isArray(set.exercises) ? set.exercises[0] : set.exercises;
                  return (
                    <li key={`${session.id}-${index}`}>
                      {exercise?.name ?? "Exercise"} · {set.reps ?? "—"} × {set.weight ?? "—"}
                      {set.is_pr ? " · PR" : ""}
                    </li>
                  );
                },
              )}
            </ul>
          </article>
        ))}
      </Panel>
    </Page>
  );
}
