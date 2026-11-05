"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { sendFeedback } from "@/lib/actions/feedback";
import type { ActionResult } from "@/lib/types";

export function FeedbackDock() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("emc-open-feedback", onOpen);
    return () => window.removeEventListener("emc-open-feedback", onOpen);
  }, []);

  if (pathname === "/sign-in") return null;

  return (
    <>
      {open ? null : (
        <button type="button" className="feedback-fab" onClick={() => setOpen(true)}>
          Feedback
        </button>
      )}
      {open ? <FeedbackSheet page={pathname.slice(0, 200)} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function FeedbackSheet({ page, onClose }: { page: string; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => sendFeedback(formData),
    null as ActionResult | null,
  );
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const sent = Boolean(state && "ok" in state);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet-panel-pop"
        role="dialog"
        aria-modal="true"
        aria-label="Send feedback"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-head">
          <h2>Send feedback</h2>
          <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {sent ? (
          <p role="status">Sent. A coach can read it.</p>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="page" value={page} />
            <label>
              Note
              <textarea name="body" required maxLength={2000} placeholder="What happened, and where" />
            </label>
            <p className="text-mute">This page is saved with the note. Leave out phone numbers and addresses.</p>
            {state && "error" in state ? <p role="alert">{state.error}</p> : null}
            <button className="primary" type="submit" disabled={pending}>
              {pending ? "Sending" : "Send feedback"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
