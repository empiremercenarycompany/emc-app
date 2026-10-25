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
  let announcements: { id: string; title: string; body: string; pinned: boolean }[] = [];
  let logsThisWindow = 0;
  if (supabase && viewer.guildId) {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, body, pinned")
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
    <Page title="Barracks" lede="Train. Record. Advance.">
      <p className="display text-3xl">Build Your Legend. Become the Hero.</p>
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.userId ? (
        <Panel>
          <p>The company book is locked until you sign in.</p>
          <Link className="button" href="/sign-in">
            Sign in
          </Link>
        </Panel>
      ) : null}
      {viewer.userId && !viewer.character ? (
        <Panel title="Recruit">
          <p>You do not have a character yet.</p>
          <Link className="button" href="/character/new">
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
          {viewer.session ? (
            <p>
              This session {viewer.session.session_number}: {viewer.session.start_date} to {viewer.session.end_date}. Logs
              in the window: {logsThisWindow}.
            </p>
          ) : (
            <p>No award window covers today. Logs still save.</p>
          )}
          {viewer.week ? <p className="text-mute">Company week {viewer.week}. Induction is a DM record, not this number.</p> : null}
          <Link className="button" href="/work">
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
        {announcements.map((item) => (
          <article key={item.id}>
            <h2>
              {item.pinned ? "Pinned · " : ""}
              {item.title}
            </h2>
            <p>{item.body}</p>
          </article>
        ))}
        {isStaff(viewer.role) && (viewer.role === "dm" || viewer.role === "admin") ? (
          <ResultForm action={postAnnouncement} submit="Post">
            <input name="title" required placeholder="Title" />
            <textarea name="body" required placeholder="Body" />
            <label className="flex items-center gap-2">
              <input className="w-auto" type="checkbox" name="pinned" /> Pin
            </label>
          </ResultForm>
        ) : null}
      </Panel>
    </Page>
  );
}
