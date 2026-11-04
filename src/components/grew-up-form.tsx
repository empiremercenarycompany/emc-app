"use client";

import { useMemo, useState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { ResultForm } from "@/components/result-form";
import { requestGrewUp, withdrawGrewUp } from "@/lib/actions/grew-up";
import { GREW_UP_KINDS, grewUpLabel, grewUpOptions, type GrewUpKind } from "@/lib/rules/grew-up";

const KIND_LABEL: Record<GrewUpKind, string> = {
  tool: "Tool",
  language: "Language",
  instrument: "Musical instrument",
  gaming: "Gaming set",
};

export function GrewUpForm({
  request,
}: {
  request: {
    id: string;
    kind: string;
    optionId: string;
    note: string;
    status: string;
    mine: boolean;
  } | null;
}) {
  const [kind, setKind] = useState<GrewUpKind>("tool");
  const options = useMemo(() => grewUpOptions(kind), [kind]);

  if (request && request.status !== "withdrawn") {
    return (
      <div className="flex flex-col gap-2">
        <p>
          {request.status === "approved" ? "Approved." : "Pending."} {KIND_LABEL[request.kind as GrewUpKind] ?? request.kind}{" "}
          · {grewUpLabel(request.kind, request.optionId)}
        </p>
        <p className="text-mute">{request.note}</p>
        {request.status === "pending" && request.mine ? (
          <ConfirmAction action={withdrawGrewUp} arm="Withdraw" confirm="Withdraw this request" hidden={{ request_id: request.id }} />
        ) : null}
      </div>
    );
  }

  return (
    <ResultForm action={requestGrewUp} submit="Request the bonus" primary>
      <label>
        Their character or name
        <input name="partner" required />
      </label>
      <label>
        Kind
        <select name="kind" value={kind} onChange={(event) => setKind(event.target.value as GrewUpKind)}>
          {GREW_UP_KINDS.map((item) => (
            <option key={item} value={item}>
              {KIND_LABEL[item]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Proficiency
        <select key={kind} name="option_id" defaultValue={options[0]?.id}>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        What you used to do together
        <textarea name="note" required maxLength={280} />
      </label>
    </ResultForm>
  );
}
