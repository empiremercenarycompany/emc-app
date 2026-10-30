import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { finalizeStats } from "@/lib/actions/muster";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { isLogApprover } from "@/lib/types";

const ABILITY: Record<string, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

const BANK: Record<string, string> = {
  physical: "workouts",
  constitution: "nutrition and sleep",
  mental: "mental goals",
  social: "social goals",
  free: "attendance",
};

export default async function TrainerPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const trainer = isLogApprover(viewer.role);
  const people =
    supabase && viewer.guildId && trainer
      ? (await supabase.from("characters").select("id, name").eq("guild_id", viewer.guildId).order("name")).data
      : [];
  const waiting =
    supabase && trainer
      ? (
          await supabase
            .from("build_placements")
            .select("character_id, ability, pool, remaining")
            .eq("status", "provisional")
            .gt("remaining", 0)
        ).data
      : [];

  return (
    <Page title="Trainer" lede="In person at the gym. Read the change, then finalize one recruit.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.userId ? (
        <p>
          <Link href="/sign-in">Sign in</Link>. A trainer finalizes the Build face to face.
        </p>
      ) : null}
      {viewer.userId && !trainer ? <p>A player account cannot finalize a Build.</p> : null}
      <Panel title="Waiting">
        <p>Not final yet: see your DM or trainer to lock these in.</p>
        {trainer ? (
          <>
            {(people ?? []).filter((person) => (waiting ?? []).some((row) => row.character_id === person.id)).length === 0 ? (
              <p className="text-mute">Nothing is waiting.</p>
            ) : null}
            {(people ?? []).map((person) => {
              const lines = (waiting ?? []).filter((row) => row.character_id === person.id);
              if (lines.length === 0) return null;
              return (
                <div key={person.id}>
                  <p>{person.name}</p>
                  {lines.map((line) => (
                    <p key={`${person.id}-${line.ability}-${line.pool}`}>
                      {ABILITY[line.ability] ?? line.ability} · {line.remaining} · {BANK[line.pool] ?? line.pool}
                    </p>
                  ))}
                </div>
              );
            })}
            <ResultForm action={finalizeStats} submit="Finalize stats" primary>
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
            </ResultForm>
          </>
        ) : (
          <>
            <p className="text-mute">Nothing is waiting.</p>
            <button className="primary" type="button">
              Finalize stats
            </button>
          </>
        )}
      </Panel>
    </Page>
  );
}
