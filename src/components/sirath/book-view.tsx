"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import type { LinkEnd, SirathEntry, SirathView, StoryKind } from "@/lib/sirath/types";

const KINDS: [StoryKind | "all", string][] = [
  ["all", "All"],
  ["person", "People"],
  ["place", "Places"],
  ["faction", "Factions"],
  ["thing", "Things"],
  ["event", "Events"],
  ["creature", "Creatures"],
];

const KIND_LABEL: Record<string, string> = {
  person: "Person",
  place: "Place",
  faction: "Faction",
  thing: "Thing",
  event: "Event",
  creature: "Creature",
};

const INVERSE: Record<string, string> = {
  "Ward of": "Ward",
  In: "Holds",
  "Based in": "Home of",
  "Works the land around": "Its land worked by",
  Leads: "Led by",
  "Officer of": "Officer",
  "Procures for": "Procured for by",
  "Died saving": "Saved by",
  "Flagship of": "Flagship",
  "Led by": "Led",
  "One of the seven": "Part of",
  Founded: "Founded by",
  "Happened at": "Saw",
};

function withQuery(path: string, query: string) {
  if (!query) return path;
  return `${path}?${query}`;
}

function Rich({ text, nouns, query }: { text: string; nouns: SirathView["unknown_nouns"]; query: string }) {
  const nodes: ReactNode[] = [];
  const re = /\{\{([?!]?)([a-z0-9-]+)\|([^}]*)\}\}/g;
  let last = 0;
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const flag = match[1];
    const id = match[2];
    const label = match[3];
    if (flag === "!") nodes.push(<span key={`${index}-p`}>{label}</span>);
    else if (flag === "?") {
      const noun = nouns[label as StoryKind] || "something you haven't learned";
      nodes.push(<span key={`${index}-s`} className="sirath-smudge" role="img" aria-label={noun} title="Not yet learned." />);
    } else {
      nodes.push(
        <Link key={`${index}-l`} href={withQuery(`/sirath/${id}`, query)}>
          {label}
        </Link>,
      );
    }
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function sessionLine(session: { label: string; date: string | null } | null | undefined) {
  if (!session) return "";
  return `${session.label}${session.date ? ` ${session.date}` : ""}`;
}

function bonusText(bonus: { total: number; own_culture: number; knows_language: number } | null) {
  if (!bonus) return "";
  const parts = [
    bonus.own_culture ? `your own culture +${bonus.own_culture}` : "",
    bonus.knows_language ? `you know the language +${bonus.knows_language}` : "",
  ].filter(Boolean);
  return ` +${bonus.total} (${parts.join(", ")})`;
}

function Find({
  entries,
  kind,
  setKind,
  query,
  id,
}: {
  entries: SirathEntry[];
  kind: string;
  setKind: (kind: string) => void;
  query: string;
  id: string;
}) {
  const [q, setQ] = useState("");
  const counts = Object.fromEntries(
    KINDS.map(([key]) => [key, key === "all" ? entries.length : entries.filter((entry) => entry.kind === key).length]),
  );
  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return entries.filter((entry) => {
      if (kind !== "all" && entry.kind !== kind) return false;
      const hay = [entry.display_name, ...entry.aliases, ...entry.tags, entry.hearsay].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [entries, kind, q]);
  return (
    <div className="sirath-find" role="search">
      <label className="sr-only" htmlFor={id}>
        Search The Sirath
      </label>
      <input id={id} type="search" placeholder="Find a person, place, faction..." value={q} onChange={(event) => setQ(event.target.value)} />
      <div className="sirath-chips" role="group" aria-label="Filter by kind">
        {KINDS.filter(([key]) => key === "all" || counts[key]).map(([key, label]) => (
          <button key={key} type="button" className="sirath-chip" aria-pressed={kind === key} onClick={() => setKind(key)}>
            {label} {counts[key]}
          </button>
        ))}
      </div>
      {q.trim() ? (
        <div className="sirath-results">
          {hits.length === 0 ? <p>Nothing in your book matches that yet.</p> : null}
          {hits.map((entry) => (
            <Link key={entry.id} href={withQuery(`/sirath/${entry.id}`, query)}>
              <strong>{entry.display_name}</strong> <span>{KIND_LABEL[entry.kind]}</span>
              <span className="block">{entry.hearsay}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function endNode(end: LinkEnd, query: string) {
  if ("id" in end) return <Link href={withQuery(`/sirath/${end.id}`, query)}>{end.name}</Link>;
  if ("public_name" in end) return <span>{end.public_name}</span>;
  return <span className="sirath-caption">Not yet learned.</span>;
}

export function SirathBook({
  view,
  entryId,
  query,
  listAll,
  from,
  session,
}: {
  view: SirathView;
  entryId?: string;
  query: string;
  listAll?: boolean;
  from?: string;
  session?: string;
}) {
  const [kind, setKind] = useState("all");
  const [note, setNote] = useState("");
  const ordered = [...view.entries].sort((a, b) => b.learned_rank - a.learned_rank || a.display_name.localeCompare(b.display_name));
  const filtered = ordered.filter((entry) => kind === "all" || entry.kind === kind);
  const fresh = new Set(view.home.new_entry_ids);
  const entry = entryId ? view.entries.find((item) => item.id === entryId) : null;

  const pane = (
    <aside className="sirath-pane" aria-label="In your book">
      <Find entries={view.entries} kind={kind} setKind={setKind} query={query} id="sirath-q-pane" />
      <p className="sec-h" style={{ padding: "10px 12px 0", color: "#111" }}>
        In your book
      </p>
      <ul>
        {filtered.map((item) => (
          <li key={item.id}>
            <Link href={withQuery(`/sirath/${item.id}`, query)} aria-current={item.id === entryId ? "page" : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sirath/sketch.svg" alt="" />
              <span>
                {item.display_name}
                <br />
                <span>{KIND_LABEL[item.kind]}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );

  if (entryId && !entry) {
    return (
      <div className="sirath-book">
        {pane}
        <section>
          <div className="sirath-leather">
            <h2>Not in your book</h2>
            <p>Your squad hasn&apos;t learned this yet.</p>
            <Link href={withQuery("/sirath", query)}>Back to The Sirath</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="sirath-book">
      {pane}
      <section>
        <div className="sirath-main-find">
          <Find entries={view.entries} kind={kind} setKind={setKind} query={query} id="sirath-q" />
        </div>
        {entry ? <Entry view={view} entry={entry} query={query} fresh={fresh} from={from} session={session} note={note} setNote={setNote} /> : <Home view={view} query={query} listAll={Boolean(listAll)} kind={kind} filtered={filtered} fresh={fresh} />}
      </section>
    </div>
  );
}

function Home({
  view,
  query,
  listAll,
  kind,
  filtered,
  fresh,
}: {
  view: SirathView;
  query: string;
  listAll: boolean;
  kind: string;
  filtered: SirathEntry[];
  fresh: Set<string>;
}) {
  const showAll = listAll || kind !== "all";
  const list = showAll ? filtered : filtered.slice(0, 5);
  const count = view.home.learned_count;
  return (
    <article className="sirath-sheet">
      <h1>The Sirath</h1>
      <p className="subtitle">What your squad has learned about Bleakspire</p>
      <p className="count-line">
        Your squad has learned {count} {count === 1 ? "thing" : "things"} about Bleakspire.
      </p>
      {view.is_new_recruit ? <p className="count-line">You start as a recruit. The rest is earned.</p> : null}
      {view.home.last_session ? (
        <>
          <hr className="sirath-rule" />
          <h2 className="sec-h">Last session</h2>
          <p className="sirath-caption">{sessionLine(view.home.last_session.session)}</p>
          <p>{view.home.last_session.summary}</p>
        </>
      ) : null}
      {fresh.size ? (
        <>
          <h2 className="sec-h">Since last session</h2>
          <ul>
            {[...fresh].map((id) => {
              const item = view.entries.find((entry) => entry.id === id);
              if (!item) return null;
              return (
                <li key={id}>
                  <Link href={withQuery(`/sirath/${id}`, query)}>{item.display_name}</Link> <span className="scouts">The scouts added a note.</span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
      {view.home.open_leads.length ? (
        <>
          <hr className="sirath-rule" />
          <h2 className="sec-h">Open leads</h2>
          <ul>
            {view.home.open_leads.map((lead) => (
              <li key={lead}>{lead}</li>
            ))}
          </ul>
        </>
      ) : null}
      <hr className="sirath-rule" />
      <h2 className="sec-h">In your book {showAll ? null : <span className="sirath-caption">(latest five)</span>}</h2>
      <div className="sirath-index">
        {list.map((item) => (
          <Link key={item.id} href={withQuery(`/sirath/${item.id}`, query)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sirath/sketch.svg" alt="" />
            <span>
              <span>{item.display_name}</span> <span className="kind-tag">{KIND_LABEL[item.kind]}</span>
              {fresh.has(item.id) ? <span className="scouts">The scouts added a note.</span> : null}
              <span className="sirath-caption block">{item.hearsay}</span>
            </span>
          </Link>
        ))}
      </div>
      {!showAll && filtered.length > 5 ? (
        <p>
          <Link href={withQuery("/sirath", `${query}${query ? "&" : ""}list=all`)}>See all {filtered.length}</Link>
        </p>
      ) : null}
      {view.is_new_recruit ? (
        <>
          <div className="sirath-sealed">
            <div className="blot" />
            <p>Not yet learned.</p>
          </div>
          <div className="sirath-sealed">
            <div className="blot" />
            <p>Not yet learned.</p>
          </div>
        </>
      ) : null}
      <hr className="sirath-rule" />
      <p className="sirath-caption">Chits: {view.chit_note}</p>
    </article>
  );
}

function Entry({
  view,
  entry,
  query,
  fresh,
  from,
  session,
  note,
  setNote,
}: {
  view: SirathView;
  entry: SirathEntry;
  query: string;
  fresh: Set<string>;
  from?: string;
  session?: string;
  note: string;
  setNote: (value: string) => void;
}) {
  const fromLabel =
    from === "check-in" ? "check-in" : from === "chat" ? "squad chat" : from === "session" ? "session recap" : null;
  const sessionName =
    session && view.home.latest_session?.id === session ? sessionLine(view.home.latest_session) : session ? "an earlier session" : "";
  const links = view.links.filter((link) => ("id" in link.from && link.from.id === entry.id) || ("id" in link.to && link.to.id === entry.id));
  const mentioned = view.entries.filter(
    (other) =>
      other.id !== entry.id &&
      [...other.tiers.common, ...other.tiers.recall, ...other.tiers.uncovered].some((fact) => fact.body.includes(`{{${entry.id}|`)),
  );
  const skills = [...new Set(entry.tiers.recall.map((fact) => fact.skill_label))];
  return (
    <>
      <p className="sirath-crumbs">
        <Link href={withQuery("/sirath", query)}>The Sirath</Link>
      </p>
      {fromLabel ? (
        <p className="sirath-from">
          Opened from your {fromLabel}
          {sessionName ? ` · ${sessionName}` : ""}
        </p>
      ) : null}
      <article className="sirath-sheet">
        <figure className="sirath-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sirath/sketch.svg" alt={entry.image?.alt || ""} />
          {entry.kind === "person" && entry.image?.likeness === false ? (
            <figcaption>A sketch of where you&apos;d find them, not a likeness.</figcaption>
          ) : null}
        </figure>
        <p>
          <span className="kind-tag">
            {KIND_LABEL[entry.kind]}
            {entry.ward && entry.kind === "place" ? ` · ${entry.ward}` : ""}
          </span>
          {fresh.has(entry.id) ? <span className="scouts">The scouts added a note.</span> : null}
        </p>
        <h1 className="entry-name">{entry.display_name}</h1>
        <p className="sirath-hearsay">
          <b>What you&apos;d hear:</b> {entry.hearsay}
        </p>
        <blockquote className="sirath-voice">
          {entry.voice_line}
          <cite>From the Company&apos;s field notes</cite>
        </blockquote>
        {entry.kind === "person" ? (
          <dl className="sirath-card">
            <dt>Seen with</dt>
            <dd>{entry.faction_hint ? <Link href={withQuery(`/sirath/${entry.faction_hint.id}`, query)}>{entry.faction_hint.name}</Link> : "Not yet learned."}</dd>
            <dt>Your chits</dt>
            <dd>{entry.chits || "None recorded"}</dd>
            <dt>Last met</dt>
            <dd>{entry.last_encounter ? `At the ${sessionLine(entry.last_encounter)}` : "Known by name; not met in play yet"}</dd>
          </dl>
        ) : null}
        <hr className="sirath-rule" />
        <h2 className="sec-h">Common knowledge</h2>
        {entry.tiers.common.map((fact) => (
          <div key={fact.id}>
            <p>
              <Rich text={fact.body} nouns={view.unknown_nouns} query={query} />
            </p>
            {fact.pull_quote ? (
              <blockquote className="sirath-pull">
                {fact.pull_quote}
                <cite>Company field notes</cite>
              </blockquote>
            ) : null}
          </div>
        ))}
        {entry.tiers.recall.length ? (
          <>
            <hr className="sirath-rule" />
            <h2 className="sec-h">
              You recall {skills.map((skill) => (
                <span key={skill} className="skill-tag">
                  {skill}
                </span>
              ))}
            </h2>
            {entry.tiers.recall.map((fact) => (
              <div key={fact.id}>
                <p>
                  <Rich text={fact.body} nouns={view.unknown_nouns} query={query} />{" "}
                  <span className="sirath-how">
                    <span className="skill-tag">{fact.skill_label}</span>
                    {fact.how === "passive" ? `passive ${fact.skill_label}` : `${fact.skill_label} roll`}
                    {bonusText(fact.bonus)}
                  </span>
                </p>
                {fact.pull_quote ? (
                  <blockquote className="sirath-pull">
                    {fact.pull_quote}
                    <cite>Company field notes</cite>
                  </blockquote>
                ) : null}
              </div>
            ))}
          </>
        ) : null}
        {entry.tiers.sealed.length ? (
          <>
            <hr className="sirath-rule" />
            <h2 className="sec-h">Sealed</h2>
            {entry.tiers.sealed.map((fact) => (
              <div key={`${fact.skill}-${fact.dc}`} className="sirath-sealed">
                <div className="blot" role="img" aria-label="Sealed text" />
                <div className="meta">
                  <span>{fact.teaser}</span>
                  <span>
                    Sealed · {fact.skill_label} DC {fact.dc} · opens with {/^[aeiou]/i.test(fact.opens_by) ? "an" : "a"} {fact.opens_by}
                  </span>
                </div>
              </div>
            ))}
          </>
        ) : null}
        {entry.tiers.uncovered.length ? (
          <>
            <hr className="sirath-rule" />
            <h2 className="sec-h">Uncovered</h2>
            {entry.tiers.uncovered.map((fact) => (
              <p key={fact.id}>
                <Rich text={fact.body} nouns={view.unknown_nouns} query={query} />
                <span className="sirath-caption block">Learned at the {sessionLine(fact.session)}</span>
              </p>
            ))}
          </>
        ) : null}
        {links.length ? (
          <>
            <hr className="sirath-rule" />
            <h2 className="sec-h">Connected to</h2>
            <ul className="sirath-connected">
              {links.map((link, index) => {
                const outgoing = "id" in link.from && link.from.id === entry.id;
                const other = outgoing ? link.to : link.from;
                const label = outgoing ? link.label : INVERSE[link.label] || link.label;
                return (
                  <li key={`${label}-${index}`}>
                    <span>{label}</span>
                    {endNode(other, query)}
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
        <hr className="sirath-rule" />
        <h2 className="sec-h">Mentioned in</h2>
        {mentioned.length ? (
          <ul>
            {mentioned.map((item) => (
              <li key={item.id}>
                <Link href={withQuery(`/sirath/${item.id}`, query)}>{item.display_name}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sirath-caption">Nothing else in your book mentions this yet.</p>
        )}
        <hr className="sirath-rule" />
        <h2 className="sec-h">Your notes</h2>
        <div className="sirath-notes">
          <label className="sr-only" htmlFor="sirath-note">
            Your notes
          </label>
          <textarea id="sirath-note" value={note} placeholder="Only you can see these." onChange={(event) => setNote(event.target.value)} />
          <p className="sirath-caption">Private to you. They are not kept on this device.</p>
        </div>
      </article>
    </>
  );
}
