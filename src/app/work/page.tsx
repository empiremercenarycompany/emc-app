import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { logWorkout } from "@/lib/actions/activity";
import { loadViewer, setupMessage } from "@/lib/company";
import { EQUIPMENT_LABELS, EQUIPMENT_VERSIONS } from "@/lib/rules/library";
import { createClient } from "@/lib/supabase/server";

export default async function WorkPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const tier = viewer.character?.inducted_at ? "inducted" : "recruit";
  const drills =
    supabase && viewer.guildId
      ? (
          await supabase
            .from("workout_library")
            .select("id, title, attribute, tier, workout_versions(equipment)")
            .eq("guild_id", viewer.guildId)
            .eq("published", true)
            .eq("tier", tier)
        ).data
      : [];
  const recent =
    supabase && viewer.character
      ? (
          await supabase
            .from("workout_logs")
            .select("id, date, exercise, type, points_awarded, status, award_track")
            .eq("character_id", viewer.character.id)
            .order("date", { ascending: false })
            .limit(12)
        ).data
      : [];

  return (
    <Page title="Work" lede="Record what you did. Staff confirm it before it is ready to place.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.character ? (
        <p>
          <Link href={viewer.userId ? "/character/new" : "/sign-in"}>
            {viewer.userId ? "Sign the Recruit Oath" : "Sign in"}
          </Link>{" "}
          before recording work.
        </p>
      ) : null}
      <Panel title="Record work">
        <ResultForm action={logWorkout} submit="Record work" primary>
          <input type="hidden" name="is_custom" value="true" />
          <label>
            What you did
            <input name="exercise" required placeholder="Swing, carry, run" />
          </label>
          <label>
            Kind
            <input name="type" required placeholder="Strength or cardio" />
          </label>
          <label>
            Date
            <input type="date" name="date" required max={viewer.today ?? undefined} defaultValue={viewer.today ?? undefined} />
          </label>
          <label>
            This counts toward
            <select name="bank_pool" defaultValue="physical">
              <option value="physical">Strength or Dexterity</option>
              <option value="constitution">Constitution, if this is cardio</option>
            </select>
          </label>
        </ResultForm>
      </Panel>
      {viewer.character ? (
        <>
          <details className="border border-steel p-4">
            <summary>Company drills</summary>
            {(drills ?? []).length === 0 ? (
              <p className="text-mute">No published {tier} drill matches you.</p>
            ) : (
              (drills ?? []).map((drill) => (
                <ResultForm key={drill.id} action={logWorkout} submit="Record this drill">
                  <input type="hidden" name="is_custom" value="false" />
                  <input type="hidden" name="library_workout_id" value={drill.id} />
                  <p>
                    {drill.title} · {drill.attribute}
                  </p>
                  <select name="equipment" required defaultValue="">
                    <option value="" disabled>
                      Equipment
                    </option>
                    {EQUIPMENT_VERSIONS.filter((version) =>
                      (drill.workout_versions ?? []).some((row: { equipment: string }) => row.equipment === version),
                    ).map((version) => (
                      <option key={version} value={version}>
                        {EQUIPMENT_LABELS[version]}
                      </option>
                    ))}
                  </select>
                  <input type="date" name="date" required max={viewer.today ?? undefined} defaultValue={viewer.today ?? undefined} />
                  <input name="sets" inputMode="numeric" placeholder="Sets" />
                  <input name="reps" inputMode="numeric" placeholder="Reps" />
                  <input name="weight" inputMode="decimal" placeholder="Weight" />
                  <label>
                    This counts toward
                    <select name="bank_pool" defaultValue="physical">
                      <option value="physical">Strength or Dexterity</option>
                      <option value="constitution">Constitution, if this is cardio</option>
                    </select>
                  </label>
                  <textarea name="notes" placeholder="Notes" />
                </ResultForm>
              ))
            )}
          </details>
          <Panel title="Recent">
            {(recent ?? []).length === 0 ? <p className="text-mute">No logs yet.</p> : null}
            <ul>
              {(recent ?? []).map((row) => (
                <li key={row.id}>
                  {row.date} · {row.exercise ?? row.type} ·{" "}
                  {row.status === "awarded" ? "Confirmed" : row.status === "pending" ? "Waiting" : "Saved"}
                </li>
              ))}
            </ul>
          </Panel>
        </>
      ) : null}
    </Page>
  );
}
