"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { DiceRoller } from "@/components/dice-roller";
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

const TABS = ["Skills", "Attacks", "Features", "Inventory", "NPCs"] as const;

export function CharacterSheet({
  name,
  classLabel,
  level,
  scores,
  hp,
  skillId,
  acOverride = null,
  speedOverride = null,
  saves = null,
  recordedSkills = null,
  recordedAttacks = null,
  recordedFeatures = null,
  recordedSpells = null,
  recordedFeats = null,
  conflicts = null,
  children,
  features,
  inventory,
  npcs,
}: {
  name: string;
  classLabel: string;
  level: number;
  scores: Record<AbilityName, number>;
  hp: number;
  skillId: string | null;
  acOverride?: number | null;
  speedOverride?: number | null;
  saves?: string[] | null;
  recordedSkills?: string[] | null;
  recordedAttacks?: string[] | null;
  recordedFeatures?: string[] | null;
  recordedSpells?: string[] | null;
  recordedFeats?: string[] | null;
  conflicts?: string[] | null;
  children?: ReactNode;
  features: ReactNode;
  inventory: ReactNode;
  npcs: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(0);
  const [roll, setRoll] = useState<string | null>(null);
  const dex = abilityModifier(scores.dexterity);
  const str = abilityModifier(scores.strength);
  const ac = acOverride ?? armorClass(dex);
  const speed = speedOverride ?? walkingSpeed();
  const bonus = proficiencyBonus(level);

  function show(index: number) {
    const next = (index + TABS.length) % TABS.length;
    setTab(next);
    const panel = track.current?.children.item(next) as HTMLElement | null;
    panel?.scrollIntoView({ inline: "start", block: "nearest" });
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
            const mod = abilityModifier(scores[skill.ability]) + (skill.id === skillId ? bonus : 0);
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
  ];

  return (
    <div className="flex flex-col gap-4">
      <section className="border border-steel p-4">
        <h2>{name}</h2>
        <p>
          {classLabel} · level {level}
        </p>
        <p>
          HP {hp} · AC {ac} · Speed {speed} · Initiative {formatModifier(dex)}
          {saves && saves.length > 0 ? ` · Saves ${saves.join(", ")}` : ""}
        </p>
        <ul className="grid grid-cols-3 gap-2">
          {ABILITIES.map((ability) => (
            <li key={ability}>
              <button className="secondary w-full" type="button" onClick={() => offer(checkExpression(abilityModifier(scores[ability])))}>
                {LABELS[ability]}
                <span className="ml-2 text-2xl">{scores[ability]}</span>
                <span className="ml-1">{formatModifier(abilityModifier(scores[ability]))}</span>
              </button>
            </li>
          ))}
        </ul>
        {children}
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
      <div ref={track} className="sheet-track" onKeyDown={onKeys} tabIndex={0}>
        {panels.map((panel, index) => (
          <section key={TABS[index]} className="sheet-panel" role="tabpanel" aria-label={TABS[index]}>
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
