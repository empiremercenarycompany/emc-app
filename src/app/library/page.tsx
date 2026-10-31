import Link from "next/link";
import { Choice } from "@/components/choice";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { saveDrill, setPublished } from "@/lib/actions/library";
import { loadViewer, setupMessage } from "@/lib/company";
import { COMPONENT_LABELS, STR_COMPONENTS } from "@/lib/rules/library";
import { createClient } from "@/lib/supabase/server";
import { isLibraryEditor } from "@/lib/types";

export default async function LibraryPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const drills =
    supabase && viewer.guildId
      ? (
          await supabase
            .from("workout_library")
            .select("id, title, attribute, tier, published, components, workout_versions(equipment)")
            .eq("guild_id", viewer.guildId)
            .order("created_at", { ascending: false })
        ).data
      : [];
  const editor = isLibraryEditor(viewer.role);

  return (
    <Page title="Library" lede="Company workouts. Each one has a gym version, a lighter version, and a home version.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.userId ? <Link href="/sign-in">Sign in</Link> : null}
      {(drills ?? [])
        .filter((drill) => drill.published || editor || viewer.role === "dm")
        .map((drill) => (
          <Panel key={drill.id} title={drill.title}>
            <p className="text-mute">
              {drill.attribute} · {drill.tier} · {drill.published ? "Published" : "Draft"} ·{" "}
              {(drill.workout_versions ?? []).map((version: { equipment: string }) => version.equipment).join(", ")}
            </p>
            {editor || (viewer.role === "dm" && drill.published) ? (
              <ResultForm action={setPublished} submit={drill.published ? "Unpublish" : "Publish"} secondary>
                <input type="hidden" name="id" value={drill.id} />
                <input type="hidden" name="published" value={drill.published ? "false" : "true"} />
              </ResultForm>
            ) : null}
          </Panel>
        ))}
      {(drills ?? []).filter((drill) => drill.published || editor || viewer.role === "dm").length === 0 ? (
        <p className="text-mute">No drills yet. Your trainer posts them before a session.</p>
      ) : null}
      {editor ? (
        <Panel title="New drill">
          <ResultForm action={saveDrill} submit="Save drill">
            <input name="title" required placeholder="Title" />
            <select name="attribute" defaultValue="str">
              {["str", "dex", "con", "int", "wis", "cha"].map((attribute) => (
                <option key={attribute} value={attribute}>
                  {attribute}
                </option>
              ))}
            </select>
            <select name="tier" defaultValue="recruit">
              <option value="recruit">Recruit</option>
              <option value="inducted">Inducted</option>
              <option value="veteran">Veteran</option>
            </select>
            <fieldset className="flex flex-col gap-1">
              <legend>Strength movements</legend>
              {STR_COMPONENTS.map((component) => (
                <Choice key={component} name="components" value={component}>
                  {COMPONENT_LABELS[component]}
                </Choice>
              ))}
            </fieldset>
            <label>
              Functional
              <textarea name="instructions_functional" />
            </label>
            <label>
              Full gym
              <textarea name="instructions_full_gym" />
            </label>
            <label>
              At home
              <textarea name="instructions_at_home" />
            </label>
            <Choice name="publish">Publish now</Choice>
          </ResultForm>
          <p className="text-sm text-mute">Veteran drills stay closed.</p>
        </Panel>
      ) : null}
    </Page>
  );
}
