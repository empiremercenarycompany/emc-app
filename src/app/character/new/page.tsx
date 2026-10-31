import { CharacterForm } from "@/components/character-form";
import { Notice, Page } from "@/components/ui";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewCharacterPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  if (viewer.character) redirect("/character");
  const supabase = await createClient();
  const species = supabase
    ? (await supabase.from("content_species").select("id, name").order("name")).data
    : [];

  return (
    <Page title="Recruitment Papers" lede="Report for duty. The Company fills the skills, the tool, and the feat from your background.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.userId ? <p className="text-mute">Sign in before the papers are filed.</p> : null}
      <CharacterForm species={species ?? []} />
    </Page>
  );
}
