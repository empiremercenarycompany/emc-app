import { redirect } from "next/navigation";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { saveStaffNote } from "@/lib/actions/campaign";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/types";

export default async function NotesPage() {
  const viewer = await loadViewer();
  if (!viewer.userId) redirect("/sign-in");
  if (!isStaff(viewer.role)) redirect("/");
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const staff = isStaff(viewer.role);
  const notes =
    supabase && staff
      ? (
          await supabase
            .from("dm_notes")
            .select("id, body, created_at, session_id, character_id, squad_id")
            .order("created_at", { ascending: false })
            .limit(40)
        ).data
      : [];
  const sessions =
    supabase && staff && viewer.guildId
      ? (await supabase.from("sessions").select("id, title").eq("guild_id", viewer.guildId)).data
      : [];
  const people =
    supabase && staff && viewer.guildId
      ? (await supabase.from("characters").select("id, name").eq("guild_id", viewer.guildId)).data
      : [];
  const squads =
    supabase && staff && viewer.guildId
      ? (await supabase.from("squads").select("id, name").eq("guild_id", viewer.guildId)).data
      : [];

  return (
    <Page title="Notes" lede="Players do not see these notes. They stay with staff.">
      {setup ? <Notice>{setup}</Notice> : null}
      {staff ? (
        <>
          <Panel title="Write">
            <ResultForm action={saveStaffNote} submit="Save note">
              <textarea name="body" required placeholder="Note" />
              <select name="session_id" defaultValue="">
                <option value="">No session</option>
                {(sessions ?? []).map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                  </option>
                ))}
              </select>
              <select name="character_id" defaultValue="">
                <option value="">No player</option>
                {(people ?? []).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              <select name="squad_id" defaultValue="">
                <option value="">No squad</option>
                {(squads ?? []).map((squad) => (
                  <option key={squad.id} value={squad.id}>
                    {squad.name}
                  </option>
                ))}
              </select>
            </ResultForm>
            <p className="text-sm text-mute">Pick a session, a player, or a squad. At least one.</p>
          </Panel>
          <Panel title="Book">
            {(notes ?? []).length === 0 ? <p className="text-mute">No notes yet.</p> : null}
            <ul className="flex flex-col gap-2">
              {(notes ?? []).map((note) => (
                <li key={note.id}>
                  <p>{note.body}</p>
                  <p className="text-mute">{String(note.created_at).slice(0, 10)}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      ) : null}
    </Page>
  );
}
