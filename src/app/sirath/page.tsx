import { SirathBook } from "@/components/sirath/book-view";
import { SirathProto } from "@/components/sirath/proto";
import { SirathSeen } from "@/components/sirath/seen";
import { sirathDevChrome } from "@/lib/sirath/fixture";
import { loadSirathView } from "@/lib/sirath/load";
import { loadSirathSource } from "@/lib/sirath/source";
import { loadViewer } from "@/lib/company";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SirathPage({
  searchParams,
}: {
  searchParams?: Promise<{ as?: string; list?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const viewer = await loadViewer();
  const view = await loadSirathView(params.as ?? null, viewer.character?.id ?? null);
  const query = new URLSearchParams();
  if (params.as) query.set("as", params.as);
  const people = sirathDevChrome() ? loadSirathSource().characters.map((person) => ({ id: person.id, label: person.label })) : [];
  return (
    <main id="main" className="sirath-main page-pad">
      {people.length ? <SirathProto as={params.as} path="/sirath" people={people} /> : null}
      <SirathSeen sessionId={view?.home.latest_session?.id ?? null} />
      {view ? (
        <SirathBook view={view} query={query.toString()} listAll={params.list === "all"} />
      ) : (
        <article className="sirath-sheet" data-tour="sirath">
          <h1>The Sirath</h1>
          <p className="subtitle">What your squad has learned about Bleakspire</p>
          <p>Sign in to open your squad&apos;s book.</p>
        </article>
      )}
    </main>
  );
}
