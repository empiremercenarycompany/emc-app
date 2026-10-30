"use client";

import { useMemo, useState } from "react";
import { ResultForm } from "@/components/result-form";
import { createCharacter } from "@/lib/actions/character";
import { speciesLabel } from "@/lib/rules/species-names";
import { ABILITIES, scoresFromBonuses, isValidStartingArray, type AbilityName } from "@/lib/rules/starting-array";

const LABELS: Record<AbilityName, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

export function CharacterForm({
  species,
  tools,
  skills,
}: {
  species: { id: string; name: string }[];
  tools: { id: string; name: string }[];
  skills: { id: string; display_name: string }[];
}) {
  const [mode, setMode] = useState<"plus2" | "plus1">("plus2");
  const [ten, setTen] = useState<AbilityName>("strength");
  const [nine, setNine] = useState<AbilityName>("dexterity");
  const [nines, setNines] = useState<AbilityName[]>(["strength", "dexterity", "constitution"]);

  const scores = useMemo(() => {
    if (mode === "plus2") return scoresFromBonuses("plus2", [ten, nine]);
    return scoresFromBonuses("plus1", nines);
  }, [mode, ten, nine, nines]);
  const valid = isValidStartingArray(scores);

  function toggleNine(ability: AbilityName) {
    setNines((current) => {
      if (current.includes(ability)) return current.filter((item) => item !== ability);
      if (current.length >= 3) return [...current.slice(1), ability];
      return [...current, ability];
    });
  }

  return (
    <ResultForm action={createCharacter} submit="Sign the Recruit Oath" primary>
      <label className="flex flex-col gap-1">
        Name
        <input name="name" required maxLength={80} />
      </label>
      <label className="flex flex-col gap-1">
        Origin word
        <input name="origin_word" required maxLength={40} />
        <span className="text-sm text-mute">TODO(lore: check with Sage/Master Canon)</span>
      </label>
      <label className="flex flex-col gap-1">
        Profession
        <input name="profession" required maxLength={80} />
      </label>
      <label className="flex flex-col gap-1">
        Species
        <select name="species" required defaultValue="">
          <option value="" disabled>
            Choose
          </option>
          {species.map((row) => (
            <option key={row.id} value={row.id}>
              {speciesLabel(row.id, row.name)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        Tool
        <select name="profession_tool" required defaultValue="">
          <option value="" disabled>
            Choose
          </option>
          {tools.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        Skill
        <select name="profession_skill" required defaultValue="">
          <option value="" disabled>
            Choose
          </option>
          {skills.map((row) => (
            <option key={row.id} value={row.id}>
              {row.display_name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2 border border-steel p-3">
        <legend>Starting array</legend>
        <p className="text-sm text-mute">All 8s, then either +2 and +1, or +1 three times. That background is separate from the 27.</p>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            checked={mode === "plus2"}
            onChange={() => setMode("plus2")}
            className="w-auto"
          />
          +2 and +1
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            checked={mode === "plus1"}
            onChange={() => setMode("plus1")}
            className="w-auto"
          />
          +1, +1, and +1
        </label>
        {mode === "plus2" ? (
          <div className="grid grid-cols-2 gap-2">
            <label>
              Score 10
              <select value={ten} onChange={(event) => setTen(event.target.value as AbilityName)}>
                {ABILITIES.map((ability) => (
                  <option key={ability} value={ability}>
                    {LABELS[ability]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Score 9
              <select value={nine} onChange={(event) => setNine(event.target.value as AbilityName)}>
                {ABILITIES.map((ability) => (
                  <option key={ability} value={ability}>
                    {LABELS[ability]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {ABILITIES.map((ability) => (
              <label key={ability} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-auto"
                  checked={nines.includes(ability)}
                  onChange={() => toggleNine(ability)}
                />
                {LABELS[ability]}
              </label>
            ))}
          </div>
        )}
        <ul className="grid grid-cols-3 gap-2 text-sm">
          {ABILITIES.map((ability) => (
            <li key={ability}>
              {LABELS[ability]} {scores[ability]}
              <input type="hidden" name={ability} value={scores[ability]} />
            </li>
          ))}
        </ul>
        {valid ? null : <p role="alert">Pick two different abilities, or exactly three for the +1 array.</p>}
      </fieldset>
    </ResultForm>
  );
}
