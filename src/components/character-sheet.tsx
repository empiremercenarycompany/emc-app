"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { DiceRoller } from "@/components/dice-roller";
import { Term } from "@/components/term";
import { checkExpression } from "@/lib/rules/dice";
import { abilityModifier, formatModifier } from "@/lib/rules/modifiers";
import { skillLabel } from "@/lib/rules/skill-names";
import { SHEET_SKILLS, armorClass, proficiencyBonus, walkingSpeed } from "@/lib/rules/sheet";
import { ABILITIES, type AbilityName } from "@/lib/rules/starting-array";

const LABELS: Record<AbilityName, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

const TABS = ["Skills", "Attacks", "Features", "Inventory", "NPCs", "Progress"] as const;

export function CharacterSheet({
  name,
  classLabel,
  level,
  scores,
  hp,
  skillId,
  skillIds = null,
  acOverride = null,
  speedOverride = null,
  saves = null,
  recordedSkills = null,
  recordedAttacks = null,
  recordedFeatures = null,
  recordedSpells = null,
  recordedFeats = null,
  conflicts = null,
  features,
  inventory,
  npcs,
  progress,
}: {
  name: string;
  classLabel: string;
  level: number;
  scores: Record<AbilityName, number>;
  hp: number;
  skillId: string | null;
  skillIds?: string[] | null;
  acOverride?: number | null;
  speedOverride?: number | null;
  saves?: string[] | null;
  recordedSkills?: string[] | null;
  recordedAttacks?: string[] | null;
  recordedFeatures?: string[] | null;
  recordedSpells?: string[] | null;
  recordedFeats?: string[] | null;
  conflicts?: string[] | null;
  features: ReactNode;
  inventory: ReactNode;
  npcs: ReactNode;
  progress: ReactNode;
}) {
  const [tab, setTab] = useState(0);
  const [roll, setRoll] = useState<string | null>(null);
  const dex = abilityModifier(scores.dexterity);
  const str = abilityModifier(scores.strength);
  const ac = acOverride ?? armorClass(dex);
  const speed = speedOverride ?? walkingSpeed();
  const bonus = proficiencyBonus(level);
  const trained = new Set<string>([...(skillId ? [skillId] : []), ...(skillIds ?? [])]);

  function show(index: number) {
    setTab((index + TABS.length) % TABS.length);
  }

  function onKeys(event: KeyboardEvent) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      show(tab + 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(tab - 1);
    }
  }

  function offer(expression: string) {
    setRoll(expression);
  }

  const panels = [
    <div key="skills" className="flex flex-col gap-2">
      {(recordedSkills ?? []).length > 0
        ? recordedSkills!.map((skill) => (
            <button key={skill} className="secondary" type="button" onClick={() => offer("1d20")}>
              {skillLabel(skill)}
            </button>
          ))
        : SHEET_SKILLS.map((skill) => {
            const mod = abilityModifier(scores[skill.ability]) + (trained.has(skill.id) ? bonus : 0);
            const expression = checkExpression(mod);
            return (
              <button key={skill.id} className="secondary" type="button" onClick={() => offer(expression)}>
                {skill.name} · {formatModifier(mod)} · {expression}
              </button>
            );
          })}
    </div>,
    <div key="attacks" className="flex flex-col gap-2">
      {(recordedAttacks ?? []).length > 0 ? (
        recordedAttacks!.map((attack) => (
          <button key={attack} className="secondary" type="button" onClick={() => offer(checkExpression(str))}>
            {attack}
          </button>
        ))
      ) : (
        <button className="secondary" type="button" onClick={() => offer(checkExpression(str))}>
          Unarmed strike · {checkExpression(str)}
        </button>
      )}
      {(recordedAttacks ?? []).length === 0 ? <p className="text-mute">More attacks arrive at induction.</p> : null}
    </div>,
    <div key="features" className="flex flex-col gap-2">
      {(recordedFeatures ?? []).map((feature) => (
        <p key={feature}>{feature}</p>
      ))}
      {(recordedSpells ?? []).length > 0 ? <p>Spells: {(recordedSpells ?? []).join(", ")}</p> : null}
      {(recordedFeats ?? []).length > 0 ? <p>Feats: {(recordedFeats ?? []).join(", ")}</p> : null}
      {(conflicts ?? []).length > 0 ? (
        <div>
          <p className="font-bold">Recorded conflicts</p>
          {(conflicts ?? []).map((flag) => (
            <p key={flag} className="text-mute">
              {flag}
            </p>
          ))}
        </div>
      ) : null}
      {features}
    </div>,
    <div key="inventory">{inventory}</div>,
    <div key="npcs">{npcs}</div>,
    <div key="progress" className="flex flex-col gap-3">
      {progress}
    </div>,
  ];

  return (
    <div className="flex flex-col gap-4">
      <section className="border border-steel p-4">
        <h2>{name}</h2>
        <p>
          {classLabel} · level {level}
        </p>
        <p>
          <Term id="hp">HP {hp}</Term>
          {" · "}
          <Term id="ac">AC {ac}</Term>
          {" · "}
          Speed {speed}
          {" · "}
          <Term id="initiative">Initiative {formatModifier(dex)}</Term>
          {saves && saves.length > 0 ? (
            <>
              {" · "}
              <Term id="saves">Saves {saves.join(", ")}</Term>
            </>
          ) : null}
        </p>
        <ul className="ability-row">
          {ABILITIES.map((ability) => (
            <li key={ability}>
              <button className="secondary ability-pill" type="button" onClick={() => offer(checkExpression(abilityModifier(scores[ability])))}>
                <span className="ability-name">{LABELS[ability]}</span>
                <span className="ability-score">{scores[ability]}</span>
                <span className="ability-mod">{formatModifier(abilityModifier(scores[ability]))}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <div role="tablist" aria-label="Sheet sections" className="flex gap-2 overflow-x-auto" onKeyDown={onKeys}>
        {TABS.map((label, index) => (
          <button
            key={label}
            role="tab"
            type="button"
            aria-selected={tab === index}
            className={tab === index ? "primary" : "secondary"}
            onClick={() => show(index)}
          >
            {label}
          </button>
        ))}
      </div>
      <div onKeyDown={onKeys}>
        {panels.map((panel, index) => (
          <section key={TABS[index]} className="sheet-panel" role="tabpanel" aria-label={TABS[index]} hidden={tab !== index}>
            <h2>{TABS[index]}</h2>
            {panel}
          </section>
        ))}
      </div>
      {roll ? (
        <section className="border border-steel p-4">
          <h2>Roll</h2>
          <DiceRoller initialExpression={roll} />
        </section>
      ) : null}
    </div>
  );
}
