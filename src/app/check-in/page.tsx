import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { submitCheckin } from "@/lib/actions/campaign";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/types";

export default async function CheckInPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const squads = supabase ? (await supabase.from("squads").select("id, name").order("name")).data : [];
  const mine =
    supabase && viewer.character
      ? (
          await supabase
            .from("weekly_checkins")
            .select("id, week_start, score, override_score, workouts")
            .eq("character_id", viewer.character.id)
            .order("week_start", { ascending: false })
            .limit(8)
        ).data
      : [];

  return (
    <Page title="Check-in" lede="Due Friday at 11:59 PM. Four objectives, scored 2, 1, or 0.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.userId ? (
        <p>
          <Link href="/sign-in">Join the Company</Link> before you check in.
        </p>
      ) : null}
      {viewer.character ? (
        <Panel title="This week">
          <p className="text-mute">
            Squad {squads?.find((squad) => squad.id === viewer.character?.squad_id)?.name ?? "Unassigned"}. RBM and CCC
            are placeholder squads.
          </p>
          <ResultForm action={submitCheckin} submit="Submit check-in" primary>
            <label>
              Week starting Monday
              <input type="date" name="week_start" required />
            </label>
            <label>
              Workouts
              <input name="workouts" inputMode="numeric" required defaultValue="0" />
            </label>
            <label>
              Bonus count
              <input name="bonus_count" inputMode="numeric" defaultValue="0" />
            </label>
            <label>
              Bonus activities
              <textarea name="bonus_activities" />
            </label>
            <label className="flex items-center gap-2">
              <input className="w-auto" type="checkbox" name="wis" /> Wisdom objective
            </label>
            <label className="flex items-center gap-2">
              <input className="w-auto" type="checkbox" name="int_mark" /> Intelligence objective
            </label>
            <label className="flex items-center gap-2">
              <input className="w-auto" type="checkbox" name="cha" /> Charisma objective
            </label>
            <label>
              Note
              <textarea name="note" />
            </label>
            <label className="flex items-center gap-2">
              <input className="w-auto" type="checkbox" name="injury_sub" /> Injury or at-home substitution
            </label>
          </ResultForm>
        </Panel>
      ) : null}
      <Panel title="Record">
        {(mine ?? []).length === 0 ? <p className="text-mute">No check-ins yet.</p> : null}
        <ul>
          {(mine ?? []).map((row) => (
            <li key={row.id}>
              {row.week_start} · mark {row.override_score ?? row.score} · workouts {row.workouts}
            </li>
          ))}
        </ul>
        {isStaff(viewer.role) ? (
          <p>
            <Link href="/api/checkins">Export JSON</Link>
          </p>
        ) : null}
      </Panel>
    </Page>
  );
}
