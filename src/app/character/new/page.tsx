import Link from "next/link";
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
  const [species, tools, skills] = supabase
    ? await Promise.all([
        supabase.from("content_species").select("id, name").order("name"),
        supabase.from("profession_tools").select("id, name").order("name"),
        supabase.from("skill_labels").select("id, display_name").order("display_name"),
      ])
    : [null, null, null];

  return (
    <Page title="Recruit oath" lede="One recruit. The Company checks the array.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.userId ? (
        <p>
          <Link href="/sign-in">Sign in</Link> before you take the oath.
        </p>
      ) : (
        <CharacterForm species={species?.data ?? []} tools={tools?.data ?? []} skills={skills?.data ?? []} />
      )}
    </Page>
  );
}
