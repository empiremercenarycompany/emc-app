"use client";

import { useState } from "react";
import { GLOSSARY, type GlossaryId } from "@/lib/rules/glossary";

export function Term({ id, children }: { id: GlossaryId; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const entry = GLOSSARY[id];
  return (
    <span className="term">
      {children ?? entry.term}
      <button
        type="button"
        className="term-button"
        aria-expanded={open}
        aria-label={`${entry.term}, plain meaning`}
        onClick={() => setOpen((value) => !value)}
      >
        i
      </button>
      {open ? (
        <span className="term-pop" role="tooltip">
          {entry.plain}
        </span>
      ) : null}
    </span>
  );
}
