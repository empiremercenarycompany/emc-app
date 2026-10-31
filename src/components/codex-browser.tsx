"use client";

import { useMemo, useState } from "react";
import { CODEX_SECTIONS, NEW_HERE, type CodexGroup, type CodexTerm } from "@/lib/rules/codex";

export function CodexBrowser({ terms }: { terms: CodexTerm[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<CodexGroup | "all">("all");
  const needle = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      terms.filter((term) => {
        if (group !== "all" && term.group !== group) return false;
        if (!needle) return true;
        const blob = `${term.term} ${term.short ?? ""} ${term.plain} ${term.inTheGame ?? ""} ${term.inRealLife ?? ""}`.toLowerCase();
        return blob.includes(needle);
      }),
    [terms, group, needle],
  );
  const starters = NEW_HERE.map((item) => terms.find((term) => term.id === item.id)).filter((term): term is CodexTerm => Boolean(term));

  return (
    <div className="span-all flex flex-col gap-4">
      <label className="paper">
        Search
        <input
          className="codex-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Try "HP" or "set"'
        />
      </label>
      <div className="chip-row filters" role="toolbar" aria-label="Codex sections">
        <button type="button" className="filter-chip" aria-pressed={group === "all"} onClick={() => setGroup("all")}>
          All
        </button>
        {CODEX_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className="filter-chip"
            aria-pressed={group === section.id}
            onClick={() => setGroup(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>
      <section className="new-here">
        <p className="eyebrow">New here?</p>
        <h2>Start with these three</h2>
        <ol>
          {NEW_HERE.map((item, index) => (
            <li key={item.id}>
              <a href={`#${item.id}`}>
                <span className="new-index">{index + 1}</span>
                <span>
                  {item.title}
                  <span className="block text-sm">{item.line}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
        {starters.length === 0 ? null : null}
      </section>
      {CODEX_SECTIONS.map((section) => {
        const rows = shown.filter((term) => term.group === section.id);
        if (group !== "all" && group !== section.id) return null;
        return (
          <section key={section.id} className="flex flex-col gap-3">
            <h2>{section.label}</h2>
            {section.id === "faq" && rows.length === 0 ? (
              <article className="paper">
                <p>FAQ answers to be written by John.</p>
              </article>
            ) : null}
            {rows.map((term) => (
              <article key={term.id} id={term.id} className="paper">
                <h3 className="sheet-name">{term.term}</h3>
                <p>{term.plain}</p>
                {term.inTheGame ? (
                  <div className="callout ink">
                    <p className="eyebrow">In the game</p>
                    <p>{term.inTheGame}</p>
                  </div>
                ) : null}
                {term.inRealLife ? (
                  <div className="callout bronze">
                    <p className="eyebrow">In real life</p>
                    <p>{term.inRealLife}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}
