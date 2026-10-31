import Link from "next/link";
import { CheckInForm } from "@/components/check-in-form";
import { Notice, Page, Panel } from "@/components/ui";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { companyWeekNumber } from "@/lib/rules/calendar";
import { CLEARANCE_LADDER, clearanceRank, PILLAR_INTERVAL, PILLAR_NAME } from "@/lib/rules/clearance";
import { currentWeekStart, parseDate } from "@/lib/rules/dates";
import { isStaff } from "@/lib/types";

export default async function CheckInPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const squadName =
    supabase && viewer.character?.squad_id
      ? (await supabase.from("squads").select("name").eq("id", viewer.character.squad_id).maybeSingle()).data?.name ?? null
      : null;
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
  const companyWeek =
    viewer.today && viewer.config?.cohort_start
      ? companyWeekNumber(parseDate(viewer.today), parseDate(viewer.config.cohort_start))
      : null;
  const rank = clearanceRank(companyWeek);

  return (
    <Page hero mark={false} title="Check-in" lede="Four quick questions">
      <p className="span-all text-center">
        Due Friday at 11:59 PM. Honest answers help your trainer help you. This does not lock your character.
      </p>
      {setup ? <Notice>{setup}</Notice> : null}
      {viewer.beginner ? (
        <Notice>Tap the card that matches your week. You do not need to know the dice.</Notice>
      ) : null}
      {!viewer.userId ? (
        <p>
          <Link href="/sign-in">Join the Company</Link> before you check in.
        </p>
      ) : null}
      {viewer.character ? (
        <Panel title="This week">
          <p className="text-mute">Squad {squadName ?? "No squad yet"}.</p>
          <CheckInForm defaultWeek={currentWeekStart(viewer.today)} />
        </Panel>
      ) : null}
      <Panel title="Clearance">
        <ul>
          {CLEARANCE_LADDER.map((tier) => (
            <li key={tier.week}>
              {tier.name} · week {tier.week}
            </li>
          ))}
        </ul>
        <p className="text-mute">
          {PILLAR_NAME} follows every {PILLAR_INTERVAL} weeks. Repeats are numbered, {PILLAR_NAME} II, then III.
        </p>
        {rank ? <p>This week: {rank}.</p> : <p className="text-mute">No clearance yet.</p>}
      </Panel>
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
