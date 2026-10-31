import Link from "next/link";
import { AnnouncementEditor, AnnouncementForm } from "@/components/announcement-form";
import { EmptyState } from "@/components/empty-state";
import { Notice, Page, Panel } from "@/components/ui";
import { postAnnouncement } from "@/lib/actions/staff";
import { loadViewer, sessionRoleLabel, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { currentWeekStart, formatMuster } from "@/lib/rules/dates";
import { TIMESLOT_FALLBACK } from "@/lib/rules/intake";
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

  return (
    <Page mark={false}>
      <header className="hero-band span-all">
        <p className="eyebrow hero-kicker">Welcome back</p>
        <h1>{welcome}</h1>
        <p>{viewer.session ? `Next muster: ${formatMuster(viewer.session.start_date)}` : "No muster on the books."}</p>
        <p className="text-mute">Times {times}.</p>
      </header>
      <p className="span-all">A squad, a story, and a reason to keep showing up.</p>
      <p className="span-all text-mute">Train. Record. Advance.</p>
      <p className="span-all">Your week shapes your character and the story.</p>
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
          <p className="text-center text-mute">Due Friday, 11:59 PM</p>
        </Panel>
      )}
      {viewer.userId ? (
        <Panel paper>
          <div className="liaison-seal" aria-hidden="true" />
          <p className="eyebrow">Company liaison</p>
          <h2>Alexandria</h2>
          <p className="text-mute">Placeholder until the liaison writes it.</p>
          <p>[Alexandria&apos;s note to you goes here: one or two warm sentences, changed weekly.]</p>
        </Panel>
      ) : null}
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
