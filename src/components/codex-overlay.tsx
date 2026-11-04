"use client";

import { useEffect } from "react";
import { CodexBrowser } from "@/components/codex-browser";
import { visibleCodex } from "@/lib/rules/codex";

/** The Codex over the current page, so a term link does not throw away the form. */
export function CodexOverlay({ focusId, onClose }: { focusId: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!focusId) return;
    document.getElementById(`overlay-${focusId}`)?.scrollIntoView({ block: "start" });
  }, [focusId]);

  return (
    <div className="codex-overlay" role="dialog" aria-modal="true" aria-label="Codex">
      <div className="codex-overlay-bar">
        <button type="button" className="secondary" onClick={onClose}>
          Back
        </button>
        <h2>Codex</h2>
      </div>
      <CodexBrowser terms={visibleCodex()} idPrefix="overlay-" />
    </div>
  );
}
