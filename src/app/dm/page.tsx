import { redirect } from "next/navigation";
import { DmBoard } from "@/components/dm-board";
import { Notice } from "@/components/ui";
import { saveDmSessionNote } from "@/lib/actions/dm";
import { roleMayOpen } from "@/lib/access";
import { loadViewer, setupMessage } from "@/lib/company";
import { loadDmTable } from "@/lib/dm/load";
import { createClient } from "@/lib/supabase/server";

export default async function DmPage({
  searchParams,
}: {
  searchParams?: Promise<{ session?: string; skill?: string }>;
}) {
  const viewer = await loadViewer();
  if (!viewer.userId) redirect("/sign-in");
  if (!roleMayOpen(viewer.role, "/dm")) redirect("/");
  const setup = setupMessage(viewer);
  if (setup) {
    return (
      <main id="main" className="page-pad dm-shell">
        <h1 className="mt-4 text-4xl">Table</h1>
        <Notice>{setup}</Notice>
      </main>
    );
  }
  const supabase = await createClient();
  if (!supabase || !viewer.guildId) {
    return (
      <main id="main" className="page-pad dm-shell">
        <h1 className="mt-4 text-4xl">Table</h1>
        <p className="mt-2">Join the company first.</p>
      </main>
    );
  }
  const params = searchParams ? await searchParams : {};
  const table = await loadDmTable(supabase, viewer.guildId, params.session, params.skill);
  return (
    <main id="main" className="page-pad dm-shell">
      <h1 className="mt-4 text-4xl">Table</h1>
      <p className="mt-2">For the DM. Players do not see this page.</p>
      <DmBoard action={saveDmSessionNote} {...table} />
    </main>
  );
}
