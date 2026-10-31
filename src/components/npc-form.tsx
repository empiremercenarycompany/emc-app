"use client";

import { useState, type FormEvent } from "react";
import { saveNpc } from "@/lib/actions/npcs";

const CAP = 500;

export function NpcForm({
  characterId,
  npcId,
  initialName = "",
  initialRelationship = "",
  initialLikeness = "",
}: {
  characterId: string | null;
  npcId?: string;
  initialName?: string;
  initialRelationship?: string;
  initialLikeness?: string;
}) {
  const [name, setName] = useState(initialName);
  const [relationship, setRelationship] = useState(initialRelationship);
  const [likeness, setLikeness] = useState(initialLikeness);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const used = relationship.length + likeness.length;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (used > CAP) {
      setError("Relationship and description stay within 500 characters.");
      return;
    }
    if (!characterId) {
      setPending(true);
      setError(null);
      return;
    }
    const data = new FormData();
    if (npcId) data.set("npc_id", npcId);
    data.set("name", name);
    data.set("relationship", relationship);
    data.set("likeness", likeness);
    data.set("submit", "yes");
    const result = await saveNpc(data);
    if ("error" in result) setError(result.error);
    else setError(null);
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <label>
        Name
        <input name="name" required value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
      </label>
      <label>
        Relationship to me
        <textarea name="relationship" value={relationship} onChange={(event) => setRelationship(event.target.value)} />
      </label>
      <label>
        What they are like
        <textarea name="likeness" value={likeness} onChange={(event) => setLikeness(event.target.value)} />
      </label>
      <p className={used > CAP ? "text-parchment" : "text-mute"} data-testid="npc-counter">
        {used} / {CAP}
      </p>
      <p className="text-mute">
        Describe someone you could meet in town. Leave out faith, worship, and innate magic. Example: a retired guard who
        keeps the gate and remembers every name.
      </p>
      <button className="primary" type="submit">
        Submit for review
      </button>
      {error ? <p role="alert">{error}</p> : null}
      {pending ? <p>Pending: your DM will review this</p> : null}
    </form>
  );
}
