"use client";

import { useEffect, useMemo, useState } from "react";
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

const ASK = "Signing up with a friend? Get the Shieldmate bonus";

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
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<GrewUpKind>("tool");
  const [partner, setPartner] = useState("");
  const [note, setNote] = useState("");
  const options = useMemo(() => grewUpOptions(kind), [kind]);
  const [optionId, setOptionId] = useState(options[0]?.id ?? "");

  useEffect(() => {
    if (!options.some((option) => option.id === optionId)) setOptionId(options[0]?.id ?? "");
  }, [options, optionId]);

  if (request && request.status !== "withdrawn") {
    const label = grewUpLabel(request.kind, request.optionId);
    const state = request.status === "approved" ? "Approved" : "Pending";
    return (
      <div className="flex flex-col gap-2">
        <p>
          Shieldmate · {state} · {label}
        </p>
        {request.note ? <p className="text-mute">{request.note}</p> : null}
        {request.status === "pending" && request.mine ? (
          <ConfirmAction action={withdrawGrewUp} arm="Withdraw" confirm="Withdraw this request" hidden={{ request_id: request.id }} />
        ) : null}
      </div>
    );
  }

  function close() {
    setOpen(false);
    setKind("tool");
    setPartner("");
    setNote("");
    setOptionId(grewUpOptions("tool")[0]?.id ?? "");
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="shieldmate-ask">
        <input
          type="checkbox"
          checked={open}
          aria-expanded={open}
          aria-controls="shieldmate-fields"
          onChange={(event) => {
            if (event.target.checked) setOpen(true);
            else close();
          }}
        />
        <span>{ASK}</span>
      </label>
      <div id="shieldmate-fields" hidden={!open}>
        <ResultForm action={requestGrewUp} submit="Request the bonus" primary>
          <label>
            Their character or name
            <input name="partner" required value={partner} onChange={(event) => setPartner(event.target.value)} />
          </label>
          <label>
            Kind
            <select
              name="kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as GrewUpKind)}
            >
              {GREW_UP_KINDS.map((item) => (
                <option key={item} value={item}>
                  {KIND_LABEL[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Proficiency
            <select name="option_id" value={optionId} onChange={(event) => setOptionId(event.target.value)}>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            What you used to do together
            <textarea name="note" required maxLength={280} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        </ResultForm>
      </div>
    </div>
  );
}
