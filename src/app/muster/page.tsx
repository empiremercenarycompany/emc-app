import Link from "next/link";
import { redirect } from "next/navigation";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { approveNpc, returnNpc } from "@/lib/actions/npcs";
import { approveSquadMuster, finalizeSquadStats, finalizeStats, recordMuster } from "@/lib/actions/muster";
import { loadViewer, setupMessage } from "@/lib/company";
import { embeddedTitle, postedSessionLine } from "@/lib/rules/adventures";
import { GOAL_REWARD_READY } from "@/lib/rules/level-four";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/types";

const ABILITY: Record<string, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

function sessionLabel(session: {
  title: string;
  session_date: string | null;
  adventures?: { title?: string | null } | { title?: string | null }[] | null;
}): string {
  return postedSessionLine({
    title: session.title,
    adventureTitle: embeddedTitle(session.adventures),
    sessionDate: session.session_date,
  });
}

const BANK: Record<string, string> = {
  physical: "workouts",
  constitution: "nutrition and sleep",
  mental: "mental goals",
  social: "social goals",
  free: "attendance",
};

export default async function MusterPage() {
  const viewer = await loadViewer();
  if (!viewer.userId) redirect("/sign-in");
  if (!isStaff(viewer.role)) redirect("/");
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const sessions =
    supabase && viewer.guildId && isStaff(viewer.role)
      ? (
          await supabase
            .from("sessions")
            .select("id, title, session_date, adventures(title)")
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
  const npcQueue =
    supabase && isStaff(viewer.role)
      ? (
          await supabase
            .from("character_npcs")
            .select("id, name, relationship, likeness, status, review_note, character_id")
            .in("status", ["pending", "draft", "approved"])
            .order("updated_at", { ascending: false })
        ).data
      : [];
  const waiting =
    supabase && isStaff(viewer.role)
      ? (
          await supabase
            .from("build_placements")
            .select("character_id, ability, pool, remaining")
            .eq("status", "provisional")
            .gt("remaining", 0)
        ).data
      : [];
  const readyRewards =
    supabase && isStaff(viewer.role)
      ? (
          await supabase
            .from("goal_rewards")
            .select("id, character_id, goals(title)")
            .eq("status", "ready")
        ).data
      : [];
  const rewardTitles = (characterId: string) =>
    (readyRewards ?? [])
      .filter((reward) => reward.character_id === characterId)
      .map((reward) => {
        const goal = Array.isArray(reward.goals) ? reward.goals[0] : reward.goals;
        return goal?.title ?? "Step";
      });

  return (
    <Page title="Table Muster" lede="In-person check-in before the episode. Confirm the week, then approve the squad.">
      {setup ? <Notice>{setup}</Notice> : null}
      <Panel title="Session and squad">
        <form className="flex flex-col gap-3" id="muster-filters">
          <label>
            Session
            <select name="session_id" defaultValue="">
              <option value="">Choose a session</option>
              {(sessions ?? []).map((session) => (
                <option key={session.id} value={session.id}>
                  {sessionLabel(session)}
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
          {(people ?? []).map((person) => {
            const titles = rewardTitles(person.id);
            return (
              <li key={person.id}>
                <p>{person.name}</p>
                {titles.map((title) => (
                  <p key={title}>
                    {GOAL_REWARD_READY} · {title}
                  </p>
                ))}
                <Link href={`/character?recruit=${person.id}`}>Open sheet</Link>
              </li>
            );
          })}
        </ul>
        {isStaff(viewer.role) ? (
          <ResultForm action={recordMuster} submit="Record muster">
            <select name="session_id" required defaultValue="">
              <option value="" disabled>
                Session
              </option>
              {(sessions ?? []).map((session) => (
                <option key={session.id} value={session.id}>
                  {sessionLabel(session)}
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
                  {sessionLabel(session)}
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
        ) : null}
      </Panel>
      <Panel title="Finalize the Build">
        <p>Not final yet: see your DM or trainer to lock these in.</p>
        {isStaff(viewer.role) ? (
          <>
            {(people ?? []).map((person) => {
              const lines = (waiting ?? []).filter((row) => row.character_id === person.id);
              return (
                <div key={person.id}>
                  <p>{person.name}</p>
                  {lines.length === 0 && rewardTitles(person.id).length === 0 ? (
                    <p className="text-mute">Nothing waiting.</p>
                  ) : null}
                  {rewardTitles(person.id).map((title) => (
                    <p key={`${person.id}-${title}`}>
                      {GOAL_REWARD_READY} · {title}
                    </p>
                  ))}
                  {lines.map((line) => (
                    <p key={`${person.id}-${line.ability}-${line.pool}`} className="text-mute">
                      {ABILITY[line.ability] ?? line.ability} · {line.remaining} · {BANK[line.pool] ?? line.pool}
                    </p>
                  ))}
                  <ResultForm action={finalizeStats} submit="Finalize stats" secondary>
                    <input type="hidden" name="character_id" value={person.id} />
                  </ResultForm>
                </div>
              );
            })}
            <ResultForm action={finalizeSquadStats} submit="Finalize all" secondary>
              <label>
                Squad
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
              </label>
            </ResultForm>
          </>
        ) : null}
      </Panel>
      <Panel title="NPC review">
        <p>A lore approver confirms a note. A DM can read it and send it back.</p>
        {isStaff(viewer.role) ? (
          <>
            {(npcQueue ?? []).length === 0 ? <p className="text-mute">No notes waiting.</p> : null}
            {(npcQueue ?? []).map((npc) => (
              <article key={npc.id} className="border border-steel p-3">
                <p>
                  {npc.name} · {npc.status}
                </p>
                <p className="text-mute">{npc.relationship}</p>
                <p>{npc.likeness}</p>
                {viewer.canApproveLore && npc.status !== "approved" ? (
                  <ResultForm action={approveNpc} submit="Approve">
                    <input type="hidden" name="npc_id" value={npc.id} />
                  </ResultForm>
                ) : (
                  <p className="text-mute">Only a lore approver can approve.</p>
                )}
                <ResultForm action={returnNpc} submit="Send back" secondary>
                  <input type="hidden" name="npc_id" value={npc.id} />
                  <label>
                    Note
                    <textarea name="note" required />
                  </label>
                </ResultForm>
              </article>
            ))}
          </>
        ) : null}
      </Panel>
    </Page>
  );
}
