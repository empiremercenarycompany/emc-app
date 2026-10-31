"use client";

import { useMemo, useState } from "react";
import { ResultForm } from "@/components/result-form";
import { createCharacter } from "@/lib/actions/character";
import {
  BACKGROUNDS,
  TOOL_LABELS,
  backgroundById,
  recruitScores,
  toolChoiceLabel,
  type RecruitBackground,
} from "@/lib/rules/backgrounds";
import { skillLabel } from "@/lib/rules/skill-names";
import { speciesLabel } from "@/lib/rules/species-names";
import { ABILITIES, type AbilityName } from "@/lib/rules/starting-array";

const SHORT: Record<AbilityName, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

export function CharacterForm({ species }: { species: { id: string; name: string }[] }) {
  const [backgroundId, setBackgroundId] = useState("farmer");
  const background = backgroundById(backgroundId) ?? BACKGROUNDS[0];
  const [toolId, setToolId] = useState(background.tools[0]);
  const [mode, setMode] = useState<"plus1" | "plus2">("plus1");
  const [plus2, setPlus2] = useState<AbilityName>(background.abilities[0]);
  const [plus1, setPlus1] = useState<AbilityName>(background.abilities[1]);

  function chooseBackground(id: string) {
    const next = backgroundById(id);
    if (!next) return;
    setBackgroundId(id);
    setToolId(next.tools[0]);
    setPlus2(next.abilities[0]);
    setPlus1(next.abilities[1]);
  }

  const scores = useMemo(
    () => recruitScores(mode, background.abilities, plus2, plus1),
    [mode, background, plus2, plus1],
  );
  const choice = background.tools.length > 1;

  return (
    <ResultForm action={createCharacter} submit="Sign your papers" primary>
      <input type="hidden" name="background_id" value={background.id} />
      <input type="hidden" name="tool_id" value={choice ? toolId : background.tools[0]} />
      <input type="hidden" name="bonus_mode" value={mode} />
      <input type="hidden" name="plus2" value={plus2} />
      <input type="hidden" name="plus1" value={plus1} />
      <label>
        Name
        <input name="name" required maxLength={80} />
      </label>
      <label>
        Species
        <select name="species" required defaultValue={species[0]?.id ?? ""}>
          {species.length === 0 ? <option value="">Choose after you sign in</option> : null}
          {species.map((row) => (
            <option key={row.id} value={row.id}>
              {speciesLabel(row.id, row.name)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Background
        <select
          aria-label="Background"
          value={background.id}
          onChange={(event) => chooseBackground(event.target.value)}
        >
          {BACKGROUNDS.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <Filled label="Skills" value={background.skills.map((skill) => skillLabel(skill)).join(", ")} />
      {choice ? (
        <label>
          {toolChoiceLabel(background.toolChoice ?? "artisan")}
          <select aria-label={toolChoiceLabel(background.toolChoice ?? "artisan")} value={toolId} onChange={(event) => setToolId(event.target.value)}>
            {background.tools.map((id) => (
              <option key={id} value={id}>
                {TOOL_LABELS[id] ?? id}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <Filled label="Tool" value={TOOL_LABELS[background.tools[0]] ?? background.tools[0]} />
      )}
      <Filled label="Feat" value={background.feat} />
      <Filled label="Abilities" value={background.abilities.map((ability) => SHORT[ability]).join(", ")} />
      <fieldset className="flex flex-col gap-3 border border-steel p-3">
        <legend>Ability bonus</legend>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Ability bonus">
          <label className="flex min-h-11 items-center gap-2">
            <input className="w-auto" type="radio" name="shown_mode" checked={mode === "plus1"} onChange={() => setMode("plus1")} />
            +1 to all three
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input className="w-auto" type="radio" name="shown_mode" checked={mode === "plus2"} onChange={() => setMode("plus2")} />
            +2 to one, +1 to another
          </label>
        </div>
        {mode === "plus2" ? (
          <div className="flex flex-col gap-3">
            <ChipRow label="+2" value={plus2} options={background.abilities} onChange={setPlus2} blocked={plus1} />
            <ChipRow label="+1" value={plus1} options={background.abilities} onChange={setPlus1} blocked={plus2} />
          </div>
        ) : null}
        <ul className="grid grid-cols-3 gap-2">
          {ABILITIES.map((ability) => (
            <li key={ability} className="stat">
              {SHORT[ability]} {scores?.[ability] ?? 8}
            </li>
          ))}
        </ul>
        {scores ? null : <p role="alert">Pick two different abilities.</p>}
      </fieldset>
    </ResultForm>
  );
}

function Filled({ label, value }: { label: string; value: string }) {
  return (
    <label>
      {label}
      <input readOnly aria-label={label} value={value} />
    </label>
  );
}

function ChipRow({
  label,
  value,
  options,
  onChange,
  blocked,
}: {
  label: string;
  value: AbilityName;
  options: RecruitBackground["abilities"];
  onChange: (ability: AbilityName) => void;
  blocked: AbilityName;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="stat">{label}</span>
      {options.map((ability) => (
        <button
          key={ability}
          type="button"
          className="secondary"
          aria-pressed={value === ability}
          disabled={ability === blocked}
          onClick={() => onChange(ability)}
        >
          {SHORT[ability]}
        </button>
      ))}
    </div>
  );
}
