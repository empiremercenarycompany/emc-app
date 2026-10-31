"use client";

import Link from "next/link";
import { useRef } from "react";
import { CODEX_SECTIONS, visibleTerm } from "@/lib/rules/codex";

export function TermSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const term = visibleTerm(id);
  const startY = useRef<number | null>(null);

  if (!term) return null;
  const section = CODEX_SECTIONS.find((row) => row.id === term.group)?.label ?? "Codex";

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet-panel-pop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="term-sheet-title"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          startY.current = event.clientY;
        }}
        onPointerUp={(event) => {
          if (startY.current != null && event.clientY - startY.current > 70) onClose();
          startY.current = null;
        }}
      >
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-head">
          <div>
            <p className="eyebrow">{section}</p>
            <h2 id="term-sheet-title">{term.term}</h2>
          </div>
          <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="sheet-plain">{term.plain}</p>
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
        <Link className="button primary" href={`/codex#${term.id}`} onClick={onClose}>
          Open in the Codex
        </Link>
        <button type="button" className="secondary" onClick={onClose}>
          Got it
        </button>
        <p className="sheet-hint">Tap outside, swipe down or press Esc to close</p>
      </div>
    </div>
  );
}
