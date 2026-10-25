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
    <Page title="Work" lede="A log saves immediately. Points follow the company config.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.character ? (
        <p>
          <Link href={viewer.userId ? "/character/new" : "/sign-in"}>
            {viewer.userId ? "Sign the Recruit Oath" : "Sign in"}
          </Link>{" "}
          before recording work.
        </p>
      ) : (
        <>
          <p className="text-mute">
            Today is {viewer.today}. Backfill is {viewer.config?.backfill_days ?? 14} days. A future date is rejected. An
            offline queue is not built.
          </p>
          <Panel title="Prescribed">
            {(drills ?? []).length === 0 ? (
              <p className="text-mute">No published {tier} drill matches you.</p>
            ) : (
              (drills ?? []).map((drill) => (
                <ResultForm key={drill.id} action={logWorkout} submit="Record Work">
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
                  <textarea name="notes" placeholder="Notes" />
                </ResultForm>
              ))
            )}
          </Panel>
          <Panel title="Custom">
            <ResultForm action={logWorkout} submit="Record Work">
              <input type="hidden" name="is_custom" value="true" />
              <input name="exercise" required placeholder="Exercise" />
              <input name="type" required placeholder="Type" />
              <input type="date" name="date" required max={viewer.today ?? undefined} defaultValue={viewer.today ?? undefined} />
              <input name="sets" inputMode="numeric" placeholder="Sets" />
              <input name="reps" inputMode="numeric" placeholder="Reps" />
              <input name="weight" inputMode="decimal" placeholder="Weight" />
              <input name="duration_minutes" inputMode="numeric" placeholder="Minutes" />
              <textarea name="notes" placeholder="Notes" />
            </ResultForm>
            <p className="text-sm text-mute">
              TODO(John): custom workouts currently use the same unit as prescribed ones. That number is in scoring config.
            </p>
          </Panel>
          <Panel title="Recent">
            {(recent ?? []).length === 0 ? <p className="text-mute">No logs yet.</p> : null}
            <ul>
              {(recent ?? []).map((row) => (
                <li key={row.id}>
                  {row.date} · {row.exercise ?? row.type} · {row.award_track} · {row.status} · {row.points_awarded}
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </Page>
  );
}
