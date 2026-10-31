"use client";

import { useRef } from "react";
import { visibleTerm } from "@/lib/rules/codex";
import { useTermSheet } from "@/components/codex-provider";

const HOLD_MS = 550;

export function Term({ id, children, className }: { id: string; children?: React.ReactNode; className?: string }) {
  const term = visibleTerm(id);
  const sheet = useTermSheet();
  const timer = useRef<number | null>(null);
  const held = useRef(false);
  const label = children ?? term?.short ?? term?.term;

  if (!term) return <span>{label}</span>;

  function open() {
    sheet.open(term!.id);
  }

  function clearHold() {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = null;
  }

  return (
    <button
      type="button"
      className={className ? `term-link ${className}` : "term-link"}
      aria-haspopup="dialog"
      aria-expanded={sheet.activeId === term.id}
      onClick={() => {
        if (held.current) {
          held.current = false;
          return;
        }
        open();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        open();
      }}
      onPointerDown={() => {
        held.current = false;
        clearHold();
        timer.current = window.setTimeout(() => {
          held.current = true;
          open();
        }, HOLD_MS);
      }}
      onPointerUp={clearHold}
      onPointerLeave={clearHold}
      onPointerCancel={clearHold}
    >
      {label}
    </button>
  );
}
