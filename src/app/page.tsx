import Link from "next/link";
import { AnnouncementEditor, AnnouncementForm } from "@/components/announcement-form";
import { EmptyState } from "@/components/empty-state";
import { Term } from "@/components/term";
import { Notice, Page, Panel } from "@/components/ui";
import { postAnnouncement } from "@/lib/actions/staff";
import { loadViewer, sessionRoleLabel, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { cohortAdventure, cohortBeginsLine, embeddedTitle, postedSessionLine } from "@/lib/rules/adventures";
import { COMPANY_ZONE, calendarDate, currentWeekStart, formatDate } from "@/lib/rules/dates";
import { nextPostedSession } from "@/lib/rules/table-sessions";
import { TIMESLOT_FALLBACK } from "@/lib/rules/intake";
import {
  constitutionGoalCurrent,
  constitutionGoalOption,
  constitutionStatusLine,
  CON_GOAL_SCORE_MIN_DEFAULT,
} from "@/lib/rules/constitution-goal";
import { showsLevelFourProgress, levelFourProgress, LEVEL_FOUR_STEPS_DEFAULT } from "@/lib/rules/level-four";
import { isStaff } from "@/lib/types";

const WEEK_ITEMS = [
  ["workouts", "Workouts"],
  ["wis", "Wisdom"],
  ["int_mark", "Intelligence"],
  ["cha", "Charisma"],
] as const;

export default async function BarracksPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  let announcements: {
    id: string;
    title: string;
    body: string;
    pinned: boolean;
    squad_id: string | null;
    squads: { name: string } | { name: string }[] | null;
  }[] = [];
  const squads =
    supabase && viewer.guildId && isStaff(viewer.role)
      ? (await supabase.from("squads").select("id, name").eq("guild_id", viewer.guildId)).data
      : [];
  if (supabase && viewer.guildId) {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, body, pinned, squad_id, squads(name)")
      .eq("guild_id", viewer.guildId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);
    announcements = data ?? [];
  }
  const missions =
    supabase && viewer.guildId
      ? (
          await supabase
            .from("missions")
            .select("id, title, description, type, status")
            .eq("guild_id", viewer.guildId)
            .eq("status", "active")
            .limit(8)
        ).data
      : [];
  const challenge = (missions ?? []).find((mission) => mission.type === "barracks") ?? (missions ?? [])[0] ?? null;

  const weekStart = currentWeekStart(viewer.today);
  const checkin =
    supabase && viewer.character
      ? (
          await supabase
            .from("weekly_checkins")
            .select("week_start, workouts, wis, int_mark, cha")
            .eq("character_id", viewer.character.id)
            .eq("week_start", weekStart)
            .maybeSingle()
        ).data
      : null;
  const mates =
    supabase && viewer.character?.squad_id
      ? (
          await supabase
            .from("characters")
            .select("id, name, portrait_url")
            .eq("squad_id", viewer.character.squad_id)
            .order("name")
        ).data
      : [];
  const slotRows = supabase ? (await supabase.from("session_timeslots").select("label, adults_only").order("start_time")).data : null;
  const times =
    slotRows && slotRows.length > 0
      ? slotRows.map((slot) => (slot.adults_only ? `${slot.label} (18+)` : slot.label)).join(", ")
      : TIMESLOT_FALLBACK.map((slot) => (slot.adultsOnly ? `${slot.label} (18+)` : slot.label)).join(", ");
  const welcome = viewer.character?.name?.trim() || viewer.displayName?.trim() || "Recruit";
  const filedCount = checkin ? 4 : 0;
  const statGoals =
    supabase && viewer.character
      ? (
          await supabase
            .from("goals")
            .select("id, title, category, is_long_term, parent_id, completed_at, is_active")
            .eq("character_id", viewer.character.id)
        ).data
      : [];
  const conWeek =
    supabase && viewer.character?.constitution_goal_id
      ? (
          await supabase
            .from("constitution_goal_weeks")
            .select("week_start, option_id")
            .eq("character_id", viewer.character.id)
            .eq("week_start", weekStart)
            .maybeSingle()
        ).data
      : null;
  const conOption = constitutionGoalOption(viewer.character?.constitution_goal_id);
  const conCurrent = constitutionGoalCurrent({
    choiceId: viewer.character?.constitution_goal_id ?? null,
    markedWeek: conWeek && conWeek.option_id === viewer.character?.constitution_goal_id ? conWeek.week_start : null,
    weekStart,
  });
  const levelFour =
    viewer.character && showsLevelFourProgress(viewer.character.level)
      ? levelFourProgress(
          (statGoals ?? []).filter((goal) => goal.parent_id && goal.completed_at).length,
          viewer.config?.level_four_steps_required ?? LEVEL_FOUR_STEPS_DEFAULT,
        )
      : null;
  const tableRows =
    supabase && viewer.guildId
      ? (
          await supabase
            .from("sessions")
            .select("session_date, squad_id, off_week, title, adventures(title)")
            .eq("guild_id", viewer.guildId)
        ).data
      : [];
  const adventureRows =
    supabase && viewer.guildId
      ? (await supabase.from("adventures").select("number, title, start_date, status").eq("guild_id", viewer.guildId)).data
      : [];
  const companyDay = viewer.today ?? formatDate(calendarDate(new Date(), COMPANY_ZONE));
  const posted = nextPostedSession(
    (tableRows ?? []).map((row) => ({
      ...row,
      adventureTitle: embeddedTitle(row.adventures as { title?: string | null } | { title?: string | null }[] | null),
    })),
    companyDay,
    viewer.character?.squad_id ?? null,
  );
  const cohort = cohortAdventure(adventureRows ?? [], viewer.config?.cohort_start ?? null);
  const postedLine = posted
    ? postedSessionLine({
        title: posted.title,
        adventureTitle: posted.adventureTitle,
        sessionDate: posted.session_date,
      })
    : null;
  const nextStep = (statGoals ?? []).find((goal) => goal.parent_id && !goal.completed_at)?.title ?? null;
  const scoreMin = viewer.config?.con_goal_score_min ?? CON_GOAL_SCORE_MIN_DEFAULT;
  const conStatus =
    viewer.character && conOption
      ? constitutionStatusLine({
          condition: conOption.condition,
          score: viewer.character.constitution,
          unspent: viewer.character.constitution_points,
          scoreMin,
          current: conCurrent,
          chosen: true,
        })
      : null;

  return (
    <Page mark={false}>
      <header className="hero-band span-all">
        <p className="eyebrow hero-kicker">Welcome back</p>
        <h1>{welcome}</h1>
        <p>
          {postedLine ? (
            <>
              Next <Term id="company-muster">muster</Term>: {postedLine}
            </>
          ) : cohort ? (
            cohortBeginsLine(cohort.title, cohort.start)
          ) : (
            <>
              Next <Term id="company-muster">muster</Term> will be posted here.
            </>
          )}
        </p>
        <p className="text-mute">Times {times}.</p>
      </header>
      <p className="span-all">A squad, a story, and a reason to keep showing up.</p>
      {setup ? (
        <div className="span-all">
          <Notice>{setup}</Notice>
        </div>
      ) : null}
      {viewer.beginner ? (
        <div className="span-all">
          <Notice>New here? Dotted words open a plain meaning. Check in once a week, record the work you did, and your trainer handles the numbers.</Notice>
        </div>
      ) : null}
      {!viewer.character ? (
        <Panel title="Start here" wide>
          <ol className="list-decimal pl-5">
            <li>Join the Company</li>
            <li>Fill Out Recruitment Papers</li>
            <li>Record work</li>
          </ol>
          {!viewer.userId ? (
            <Link className="button primary" href="/sign-in">
              Join the Company
            </Link>
          ) : (
            <Link className="button primary" href="/character/new">
              Fill Out Recruitment Papers
            </Link>
          )}
          {viewer.userId && !viewer.intake ? (
            <Link className="button" href="/intake">
              Tell us about you
            </Link>
          ) : null}
        </Panel>
      ) : (
        <Panel wide>
          <h2 className="text-center">This week</h2>
          <p className="text-center">
            {filedCount} of 4 filed. Takes about a minute.
            {viewer.character.squad_id
              ? ""
              : isStaff(viewer.role)
                ? ` ${sessionRoleLabel(viewer.role, viewer.canApproveLore) ?? "Staff"}, no squad on this sheet.`
                : ""}
          </p>
          <ul className="week-grid">
            {WEEK_ITEMS.map(([key, label]) => {
              const answered = Boolean(checkin);
              return (
                <li key={key} className="week-item">
                  {label}
                  <span className={answered ? "week-dot filed" : "week-dot"} aria-hidden="true" />
                </li>
              );
            })}
          </ul>
          <Link className="button primary" href={checkin ? "/work" : "/check-in"}>
            {checkin ? "Record work" : "File your check-in"}
          </Link>
          <p className="text-center text-mute">
            Due Friday, 11:59 PM. Your <Term id="clearance">Clearance</Term> is on this weekly check-in, separate from{" "}
            <Term id="company-muster">muster</Term>.
          </p>
        </Panel>
      )}
      <Panel title="Goals" wide>
        <p>Goals are the work of the Company. Each one feeds a score, and the story follows what you keep.</p>
        <ul>
          <li>
            <Term id="con">Constitution</Term> · {conOption ? conOption.label : "sleep, meal prep, or cardio"}
            {conStatus ? ` · ${conStatus}` : ""}
          </li>
          <li>
            Intelligence ·{" "}
            {(statGoals ?? []).find((goal) => goal.category === "intelligence" && goal.is_active && !goal.parent_id)?.title ??
              "a mental goal"}
          </li>
          <li>
            Wisdom ·{" "}
            {(statGoals ?? []).find((goal) => goal.category === "wisdom" && goal.is_active && !goal.parent_id)?.title ??
              "a mental goal"}
          </li>
        </ul>
        {levelFour ? (
          <p>
            Level 4: {levelFour.label}
            {nextStep ? ` · Next: ${nextStep}` : ""}
          </p>
        ) : null}
        <p className="text-mute">Strength and Dexterity are built by workouts. Charisma is built by social goals.</p>
        <Link className="button primary" href="/goals">
          Open goals
        </Link>
      </Panel>
      {viewer.character ? (
        <Panel>
          <h2>Your squad</h2>
          {(mates ?? []).length === 0 ? (
            <EmptyState title="No squad yet">
              <p>Portraits land here when a squad is assigned.</p>
            </EmptyState>
          ) : (
            <ul className="squad-row">
              {(mates ?? []).map((mate) => (
                <li key={mate.id} className="squad-avatar" title={mate.name}>
                  {mate.portrait_url ? (
                    // Portrait from the recruit's own file.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mate.portrait_url} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    (mate.name?.trim().charAt(0) || "R").toUpperCase()
                  )}
                  <span className="sr-only">{mate.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}
      <Panel title="From the Company" paper wide>
        {announcements.length === 0 ? <p className="text-mute">Nothing posted.</p> : null}
        {announcements.map((item) => {
          const squad = Array.isArray(item.squads) ? item.squads[0] : item.squads;
          return (
            <article key={item.id}>
              {item.pinned ? <p className="eyebrow">Pinned notice</p> : null}
              <h2>{item.title}</h2>
              <p className="text-mute">{squad ? squad.name : "Company"}</p>
              <p>{item.body}</p>
              {isStaff(viewer.role) ? (
                <AnnouncementEditor
                  item={{
                    id: item.id,
                    title: item.title,
                    body: item.body,
                    squadId: item.squad_id,
                    pinned: item.pinned,
                  }}
                  squads={(squads ?? []).map((squad) => ({ id: squad.id, name: squad.name }))}
                />
              ) : null}
            </article>
          );
        })}
        {isStaff(viewer.role) ? (
          <AnnouncementForm squads={(squads ?? []).map((squad) => ({ id: squad.id, name: squad.name }))} action={postAnnouncement} />
        ) : null}
      </Panel>
      <Panel title="Challenge" wide>
        {challenge ? (
          <>
            <p className="eyebrow">{challenge.type}</p>
            <h2>{challenge.title}</h2>
            {challenge.description ? <p>{challenge.description}</p> : null}
            <Link className="button" href="/missions">
              Open missions
            </Link>
          </>
        ) : (
          <EmptyState title="No challenge is posted">
            <p>Active missions stay on the Missions board.</p>
          </EmptyState>
        )}
      </Panel>
    </Page>
  );
}
