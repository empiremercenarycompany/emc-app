"use client";

import { useActionState, useState } from "react";
import { Choice } from "@/components/choice";
import { ConfirmAction } from "@/components/confirm-action";
import { ResultForm } from "@/components/result-form";
import { deleteAnnouncement, updateAnnouncement } from "@/lib/actions/staff";
import type { ActionResult } from "@/lib/types";

export function AnnouncementForm({
  squads,
  action,
}: {
  squads: { id: string; name: string }[];
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [squadId, setSquadId] = useState("");
  const [pinned, setPinned] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => action(formData),
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3" autoComplete="off">
      <label>
        Title
        <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} required autoComplete="off" />
      </label>
      <label>
        Body
        <textarea name="body" value={body} onChange={(event) => setBody(event.target.value)} required />
      </label>
      <label>
        Who sees it
        <select name="squad_id" value={squadId} onChange={(event) => setSquadId(event.target.value)}>
          <option value="">Whole company</option>
          {squads.map((squad) => (
            <option key={squad.id} value={squad.id}>
              {squad.name}
            </option>
          ))}
        </select>
      </label>
      <Choice name="pinned" checked={pinned} onChange={setPinned}>
        Pin
      </Choice>
      <button disabled={pending || title.trim().length === 0 || body.trim().length === 0} type="submit" aria-busy={pending}>
        {pending ? "Saving" : "Post"}
      </button>
      {state && "error" in state ? <p role="alert">{state.error}</p> : null}
      {state && "ok" in state ? <p>Saved.</p> : null}
    </form>
  );
}

export function AnnouncementEditor({
  item,
  squads,
}: {
  item: { id: string; title: string; body: string; squadId: string | null; pinned: boolean };
  squads: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button className="secondary" type="button" onClick={() => setOpen(true)}>
        Edit
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <ResultForm action={updateAnnouncement} submit="Save announcement">
        <input type="hidden" name="announcement_id" value={item.id} />
        <label>
          Title
          <input name="title" required defaultValue={item.title} autoComplete="off" />
        </label>
        <label>
          Body
          <textarea name="body" required defaultValue={item.body} />
        </label>
        <label>
          Who sees it
          <select name="squad_id" defaultValue={item.squadId ?? ""}>
            <option value="">Whole company</option>
            {squads.map((squad) => (
              <option key={squad.id} value={squad.id}>
                {squad.name}
              </option>
            ))}
          </select>
        </label>
        <Choice name="pinned" defaultChecked={item.pinned}>
          Pin
        </Choice>
      </ResultForm>
      <ConfirmAction
        action={deleteAnnouncement}
        arm="Delete"
        confirm="Delete this announcement"
        hidden={{ announcement_id: item.id }}
      />
      <button className="secondary" type="button" onClick={() => setOpen(false)}>
        Close
      </button>
    </div>
  );
}
