"use client";

import { useState } from "react";
import { WORK_KINDS, workKind, type WorkKindId } from "@/lib/rules/work-kind";

export function WorkKindFields() {
  const [kind, setKind] = useState<WorkKindId>("lifting");
  const row = workKind(kind);
  return (
    <>
      <label>
        What kind of work?
        <select
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as WorkKindId)}
        >
          {WORK_KINDS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <input type="hidden" name="type" value={row.type} />
      <input type="hidden" name="bank_pool" value={row.pool} />
      <p className="text-mute">{row.feedback}</p>
    </>
  );
}
