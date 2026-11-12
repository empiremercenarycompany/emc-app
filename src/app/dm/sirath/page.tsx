import { redirect } from "next/navigation";
import "@/components/sirath/sirath.css";
import { QueueControls } from "@/components/sirath/queue-controls";
import { SirathProto } from "@/components/sirath/proto";
import { roleMayOpen } from "@/lib/access";
import { loadViewer } from "@/lib/company";
import { sirathFixtureAllowed } from "@/lib/sirath/fixture";
import { loadSirathSource } from "@/lib/sirath/source";

export const dynamic = "force-dynamic";

const ITEMS = [
  {
    id: "meeting",
    who: "Example squad",
    sess: "Example muster",
    what: "Reveal a sample entry to the squad (source: meeting)",
    quote: "Drafted from the reviewed recap. Players see nothing until approved.",
  },
  {
    id: "note",
    who: "Second example squad",
    sess: "Example muster",
    what: "Uncovered sample fact",
    quote: "A made-up sentence for the review screen. It is not canon.",
  },
  {
    id: "public",
    who: "Name visibility",
    sess: "Entry: Public Dock",
    what: "Before a squad learns this entry, how should its name read where it is mentioned?",
    quote: "Common knowledge: plain text, no link. Otherwise smudged (the default).",
    showPublic: true,
    defaultPublic: true,
  },
  {
    id: "smudged",
    who: "Name visibility",
    sess: "Entry: Secret Runner",
    what: "Before a squad learns this entry, how should its name read where it is mentioned?",
    quote: "This sample name stays smudged.",
    showPublic: true,
    defaultPublic: false,
  },
  {
    id: "roll",
    who: "Example character B1",
    sess: "Example muster",
    what: "A sample roll opens one fact for that character only",
    quote: "Per-character reveal. The rest of the squad does not see these facts.",
  },
] as const;

async function publishQueue() {
  "use server";
}

export default async function SirathQueuePage({
  searchParams,
}: {
  searchParams?: Promise<{ as?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const fixture = sirathFixtureAllowed();
  if (!fixture) {
    const viewer = await loadViewer();
    if (!viewer.userId) redirect("/sign-in");
    if (!roleMayOpen(viewer.role, "/dm")) redirect("/");
  }
  const people = fixture ? loadSirathSource().characters.map((person) => ({ id: person.id, label: person.label })) : [];
  return (
    <main id="main" className="sirath-main page-pad sirath-queue">
      {people.length ? <SirathProto as={params.as ?? "ch-a1"} path="/dm/sirath" people={people} /> : null}
      <div className="sirath-proto">DM side. Not part of any player payload.</div>
      <div className="px-4">
        <h1>Sirath review queue</h1>
        {ITEMS.map((item) => (
          <article key={item.id} className="sirath-leather">
            <QueueControls showPublic={"showPublic" in item && item.showPublic} defaultPublic={"defaultPublic" in item && item.defaultPublic} />
            <h2>
              {item.who} · {item.sess}
            </h2>
            <p>{item.what}</p>
            <blockquote>{item.quote}</blockquote>
          </article>
        ))}
        <form action={publishQueue}>
          <button className="button primary" type="submit">
            Publish approved to players
          </button>
        </form>
        <p>
          Approval writes story reveals with the session id. Reveals are never revoked. The name toggle sets public name, and the default is smudged.
          This preview does not publish.
        </p>
      </div>
    </main>
  );
}
