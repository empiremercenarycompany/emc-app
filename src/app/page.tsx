import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { postAnnouncement } from "@/lib/actions/staff";
import { saveDisplayName } from "@/lib/actions/character";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/types";

export default async function BarracksPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  let announcements: { id: string; title: string; body: string; pinned: boolean; squads: { name: string } | { name: string }[] | null }[] = [];
  let logsThisWindow = 0;
  const squads =
    supabase && viewer.guildId && isStaff(viewer.role)
      ? (await supabase.from("squads").select("id, name").eq("guild_id", viewer.guildId)).data
      : [];
  if (supabase && viewer.guildId) {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, body, pinned, squads(name)")
      .eq("guild_id", viewer.guildId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);
    announcements = data ?? [];
  }
  if (supabase && viewer.character && viewer.session) {
    const { count } = await supabase
      .from("workout_logs")
      .select("id", { count: "exact", head: true })
      .eq("character_id", viewer.character.id)
      .gte("date", viewer.session.start_date)
      .lte("date", viewer.session.end_date);
    logsThisWindow = count ?? 0;
  }

  return (
    <Page title="Barracks" lede="A squad, a story, and a reason to keep showing up.">
      <p className="text-mute">Train. Record. Advance.</p>
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.userId ? (
        <Panel>
          <p>The Company book is locked until you join.</p>
          <Link className="button primary" href="/sign-in">
            Join the Company
          </Link>
        </Panel>
      ) : null}
      {viewer.userId && !viewer.character ? (
        <Panel title="Recruit">
          <p>You have not taken the Recruit Oath.</p>
          <Link className="button primary" href="/character/new">
            Sign the Recruit Oath
          </Link>
        </Panel>
      ) : null}
      {viewer.character ? (
        <Panel title={viewer.character.name}>
          <p>
            {viewer.character.rank} · level {viewer.character.level} ·{" "}
            {viewer.character.class ?? "Not yet inducted"}
          </p>
          <p>
            Physical {viewer.character.physical_points} · Constitution {viewer.character.constitution_points} · Mental{" "}
            {viewer.character.mental_points}
          </p>
          <p className="text-mute">Attribute growth comes from your workouts and the goals you hit.</p>
          {viewer.session ? (
            <p>
              This session {viewer.session.session_number}: {viewer.session.start_date} to {viewer.session.end_date}. Logs
              in the window: {logsThisWindow}.
            </p>
          ) : (
            <p>No award window covers today. Logs still save.</p>
          )}
          {viewer.week ? <p className="text-mute">Company week {viewer.week}. Induction is a DM record, not this number.</p> : null}
          <Link className="button primary" href="/work">
            Record Work
          </Link>
        </Panel>
      ) : null}
      {viewer.userId ? (
        <Panel title="What the company calls you">
          <ResultForm action={saveDisplayName} submit="Save name">
            <input name="display_name" defaultValue={viewer.displayName ?? ""} maxLength={80} />
          </ResultForm>
        </Panel>
      ) : null}
      <Panel title="Announcements">
        {announcements.length === 0 ? <p className="text-mute">Nothing posted.</p> : null}
        {announcements.map((item) => {
          const squad = Array.isArray(item.squads) ? item.squads[0] : item.squads;
          return (
            <article key={item.id}>
              <h2>
                {item.pinned ? "Pinned · " : ""}
                {item.title}
              </h2>
              <p className="text-mute">{squad ? squad.name : "Company"}</p>
              <p>{item.body}</p>
            </article>
          );
        })}
        {isStaff(viewer.role) ? (
          <ResultForm action={postAnnouncement} submit="Post">
            <input name="title" required placeholder="Title" />
            <textarea name="body" required placeholder="Body" />
            <select name="squad_id" defaultValue="">
              <option value="">Whole company</option>
              {(squads ?? []).map((squad) => (
                <option key={squad.id} value={squad.id}>
                  {squad.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2">
              <input className="w-auto" type="checkbox" name="pinned" /> Pin
            </label>
          </ResultForm>
        ) : null}
      </Panel>
    </Page>
  );
}
