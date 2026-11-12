import { SirathBook } from "@/components/sirath/book-view";
import { SirathProto } from "@/components/sirath/proto";
import { SirathSeen } from "@/components/sirath/seen";
import { sirathDevChrome } from "@/lib/sirath/fixture";
import { loadSirathView } from "@/lib/sirath/load";
import { loadSirathSource } from "@/lib/sirath/source";
import { loadViewer } from "@/lib/company";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SirathEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ as?: string; from?: string; session?: string }>;
}) {
  const { id } = await params;
  const queryParams = searchParams ? await searchParams : {};
  const viewer = await loadViewer();
  const view = await loadSirathView(queryParams.as ?? null, viewer.character?.id ?? null);
  const query = new URLSearchParams();
  if (queryParams.as) query.set("as", queryParams.as);
  const people = sirathDevChrome() ? loadSirathSource().characters.map((person) => ({ id: person.id, label: person.label })) : [];
  return (
    <main id="main" className="sirath-main page-pad">
      {people.length ? <SirathProto as={queryParams.as} path={`/sirath/${id}`} people={people} /> : null}
      <SirathSeen sessionId={view?.home.latest_session?.id ?? null} />
      {view ? (
        <SirathBook view={view} entryId={id} query={query.toString()} from={queryParams.from} session={queryParams.session} />
      ) : (
        <article className="sirath-sheet">
          <h1>Not in your book</h1>
          <p>Your squad hasn&apos;t learned this yet.</p>
        </article>
      )}
    </main>
  );
}
