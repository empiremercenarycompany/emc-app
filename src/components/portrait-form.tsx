"use client";

import { useActionState, useState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { removePortrait, savePortrait } from "@/lib/actions/portrait";
import { PORTRAIT_EDGE, PORTRAIT_MAX_STORED, portraitRejection } from "@/lib/rules/portrait";
import type { ActionResult } from "@/lib/types";

async function fitPortrait(file: File): Promise<{ file: File } | { error: string }> {
  const rejection = portraitRejection({ type: file.type, size: file.size });
  if (rejection) return { error: rejection };
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PORTRAIT_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return { error: "That image could not be prepared." };
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  let blob: Blob | null = null;
  for (const quality of [0.86, 0.74, 0.62, 0.5, 0.38]) {
    blob = await new Promise((resolve) => canvas.toBlob((next) => resolve(next), "image/webp", quality));
    if (blob && blob.size <= PORTRAIT_MAX_STORED) break;
  }
  if (!blob || blob.size > PORTRAIT_MAX_STORED) {
    blob = await new Promise((resolve) => canvas.toBlob((next) => resolve(next), "image/jpeg", 0.7));
  }
  if (!blob || blob.size > PORTRAIT_MAX_STORED) return { error: "That image is still too large after resizing." };
  const type = blob.type === "image/jpeg" ? "image/jpeg" : "image/webp";
  const ext = type === "image/jpeg" ? "jpg" : "webp";
  return { file: new File([blob], `portrait.${ext}`, { type }) };
}

export function PortraitForm({ hasPortrait }: { hasPortrait: boolean }) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => {
      const picked = formData.get("portrait");
      if (!(picked instanceof File) || picked.size < 1) return { error: "Choose an image." };
      const prepared = await fitPortrait(picked);
      if ("error" in prepared) return { error: prepared.error };
      const next = new FormData();
      next.set("portrait", prepared.file);
      return savePortrait(next);
    },
    null as ActionResult | null,
  );

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-col gap-3">
        <label>
          Portrait
          <input
            name="portrait"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={() => setLocalError(null)}
          />
        </label>
        <p className="text-mute">JPEG, PNG, or WebP. It is resized to about 512px before it is saved.</p>
        {localError ? <p role="alert">{localError}</p> : null}
        {state && "error" in state ? <p role="alert">{state.error}</p> : null}
        {state && "ok" in state ? <p role="status">Portrait saved.</p> : null}
        <button className="secondary" type="submit" disabled={pending}>
          {pending ? "Saving" : "Save portrait"}
        </button>
      </form>
      {hasPortrait ? <ConfirmAction action={removePortrait} arm="Remove portrait" confirm="Remove portrait" hidden={{}} /> : null}
    </div>
  );
}
