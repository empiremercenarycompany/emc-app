"use client";

import { useState } from "react";
import { ResultForm } from "@/components/result-form";
import type { ActionResult } from "@/lib/types";

export function ConfirmAction({
  action,
  arm,
  confirm,
  hidden,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  arm: string;
  confirm: string;
  hidden: Record<string, string>;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button className="secondary" type="button" onClick={() => setArmed(true)}>
        {arm}
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-mute">This step is the confirm. It does not run until you press the button.</p>
      <ResultForm action={action} submit={confirm} secondary>
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <input type="hidden" name="confirm" value="yes" />
      </ResultForm>
      <button className="secondary" type="button" onClick={() => setArmed(false)}>
        Cancel
      </button>
    </div>
  );
}
